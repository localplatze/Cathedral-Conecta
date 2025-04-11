import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { FIREBASE_AUTH, FIREBASE_DB } from '../firebaseConnection';
import { ref, get } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkPersistentLogin();
  }, []);

  const checkPersistentLogin = async () => {
    try {
      setIsLoading(true);
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        // Attempt to sign in with stored credentials
        const userCredential = await signInWithEmailAndPassword(
          FIREBASE_AUTH, 
          userData.email, 
          userData.password
        );
        
        const user = userCredential.user;
        const userRef = ref(FIREBASE_DB, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userDetails = snapshot.val();
          const isAdmin = userDetails.isAdmin;

          const updatedUserData = {...userData, isAdmin};
          await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
          
          navigation.reset({
            index: 0,
            routes: [{ name: userData.isAdmin ? 'Admin' : 'Home' }]
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }]
          });
        }
      }
    } catch (error) {
      // If stored login fails, clear stored data
      await AsyncStorage.removeItem('userData');
      console.error('Stored login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(FIREBASE_AUTH, email, password);
      const user = userCredential.user;

      // Verificar se é admin no Realtime Database
      const userRef = ref(FIREBASE_DB, `users/${user.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        
        // Save login credentials securely
        await AsyncStorage.setItem('userData', JSON.stringify({
          email,
          password,
          uid: user.uid,
          isAdmin: userData.isAdmin
        }));
        
        navigation.reset({
          index: 0,
          routes: [{ name: userData.isAdmin ? 'Admin' : 'Home' }]
        });
      } else {
        // Save login credentials securely without admin status
        await AsyncStorage.setItem('userData', JSON.stringify({
          email,
          password,
          uid: user.uid,
          isAdmin: false
        }));
        
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }]
        });
      }

    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Email ou senha inválidos');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#1D854C" barStyle="light-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Abraço Pet</Text>
        </View>
        <View style={[styles.content, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#1D854C" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1D854C" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Abraço Pet</Text>
      </View>
      
      <View style={styles.content}>
        <Image
          style={styles.logo}
          source={require('../assets/pet.png')}
          resizeMode="contain"
        />

        <View style={styles.formContainer}>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="email" size={20} color="#1D854C" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#A8A8A8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputWrapper}>
            <MaterialIcons name="lock" size={20} color="#1D854C" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#A8A8A8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <MaterialIcons
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color="#1D854C"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Recover')}
            style={styles.forgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>ENTRAR</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OU</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>CRIAR CONTA</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 60,
    backgroundColor: '#1D854C',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 180,
    marginTop: 30,
    marginBottom: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 55,
  },
  inputIcon: {
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#333333',
    fontSize: 16,
  },
  eyeIcon: {
    paddingHorizontal: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#1D854C',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#1D854C',
    borderRadius: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    paddingHorizontal: 10,
    color: '#777777',
    fontSize: 14,
  },
  registerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1D854C',
  },
  registerButtonText: {
    color: '#1D854C',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#1D854C',
    fontSize: 16,
  }
});