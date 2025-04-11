import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { FIREBASE_AUTH } from '../firebaseConnection';
import { Alert } from 'react-native';

export const RecoverScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRecover = async () => {
    if (!email) {
      Alert.alert('Erro', 'Por favor, informe seu email');
      return;
    }

    try {
      setIsLoading(true);
      await sendPasswordResetEmail(FIREBASE_AUTH, email);
      Alert.alert(
        'Email enviado',
        'Verifique sua caixa de entrada e siga as instruções para recuperar sua senha',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível enviar o email de recuperação');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1D854C" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recuperar Senha</Text>
        <View style={styles.rightSpace} />
      </View>

      <View style={styles.content}>
        <Image
          style={styles.lockIcon}
          source={require('../assets/pet.png')}
          resizeMode="contain"
        />

        <Text style={styles.title}>Esqueceu sua senha?</Text>
        <Text style={styles.subtitle}>
          Não se preocupe! Informe seu email e enviaremos instruções para redefinir sua senha.
        </Text>

        <View style={styles.inputWrapper}>
          <MaterialIcons name="email" size={20} color="#1D854C" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Seu endereço de e-mail"
            placeholderTextColor="#A8A8A8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={styles.recoverButton}
          onPress={handleRecover}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.recoverButtonText}>ENVIAR INSTRUÇÕES</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginLinkText}>
            Lembrou sua senha? <Text style={styles.loginLinkTextBold}>Fazer login</Text>
          </Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 4,
  },
  backButton: {
    padding: 8,
  },
  rightSpace: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#777777',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 55,
    width: '100%',
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
  recoverButton: {
    backgroundColor: '#1D854C',
    borderRadius: 12,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    width: '100%',
    elevation: 2,
  },
  recoverButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  loginLink: {
    marginTop: 8,
  },
  loginLinkText: {
    color: '#777777',
    fontSize: 14,
  },
  loginLinkTextBold: {
    color: '#1D854C',
    fontWeight: 'bold',
  },
});