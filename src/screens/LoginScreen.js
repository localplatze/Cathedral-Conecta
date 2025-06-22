import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView,
  SafeAreaView, Alert, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { FIREBASE_AUTH, FIREBASE_DB } from '../firebaseConnection';
import { useAuth } from '../AuthContext';

export const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false); 
  const { fetchAndSetUserData } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha o email e a senha.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const userCredential = await signInWithEmailAndPassword(FIREBASE_AUTH, email.trim(), password);
      const user = userCredential.user;
    } catch (error) {
      console.error("Erro no login:", error.code, error.message);
      let errorMessage = 'Email ou senha inválidos. Por favor, tente novamente.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Credenciais inválidas. Verifique seu email e senha.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'O formato do email é inválido.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas de login. Tente novamente mais tarde.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Erro de rede. Verifique sua conexão e tente novamente.';
      }
      Alert.alert('Erro no Login', errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1D854C" barStyle="light-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{flexGrow: 1}}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Cathedral Conecta</Text>
            </View>
            
            <View style={styles.content}>
                <Image
                style={styles.logo}
                source={require('../assets/vert_logo.png')}
                resizeMode="contain"
                />

                <View style={styles.formContainer}>
                <View style={styles.inputWrapper}>
                    <MaterialIcons name="person-outline" size={22} color="#4A5568" style={styles.inputIcon} />
                    <TextInput
                    style={styles.input}
                    placeholder="Seu e-mail"
                    placeholderTextColor="#A0AEC0"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    />
                </View>
                
                <View style={styles.inputWrapper}>
                    <MaterialIcons name="lock-outline" size={22} color="#4A5568" style={styles.inputIcon} />
                    <TextInput
                    style={styles.input}
                    placeholder="Sua senha"
                    placeholderTextColor="#A0AEC0"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                    >
                    <Ionicons
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={24}
                        color="#6B7280"
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
                    style={[styles.loginButton, isLoggingIn && styles.buttonDisabled]}
                    onPress={handleLogin}
                    activeOpacity={0.8}
                    disabled={isLoggingIn}
                >
                    {isLoggingIn ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <Text style={styles.loginButtonText}>ENTRAR</Text>
                    )}
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
                    disabled={isLoggingIn}
                >
                    <Text style={styles.registerButtonText}>CRIAR CONTA</Text>
                </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    height: 60,
    backgroundColor: '#1D854C',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 30,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', 
    borderRadius: 10, 
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0', 
    height: 54, 
    paddingHorizontal: 5,
  },
  inputIcon: {
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#1A202C',
    fontSize: 16,
    paddingRight: 10,
  },
  eyeIcon: {
    paddingHorizontal: 12,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 25,
    paddingVertical: 5,
  },
  forgotPasswordText: {
    color: '#1D854C',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#1D854C',
    borderRadius: 10,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
    elevation: 2,
    shadowColor: '#052e16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    paddingHorizontal: 12,
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#1D854C',
  },
  registerButtonText: {
    color: '#1D854C',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});