import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView,
  SafeAreaView, StatusBar, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { FIREBASE_AUTH } from '../firebaseConnection';

export const RecoverScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRecover = async () => {
    if (!email.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, informe seu endereço de e-mail.');
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(FIREBASE_AUTH, email.trim());
      Alert.alert(
        'Verifique seu E-mail',
        `Enviamos instruções para ${email.trim()} para você redefinir sua senha.`,
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      console.error("Erro ao recuperar senha:", error.code, error.message);
      let errorMessage = 'Não foi possível enviar o e-mail de recuperação. Tente novamente.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Nenhuma conta encontrada com este endereço de e-mail.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'O formato do email é inválido.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Erro de rede. Verifique sua conexão e tente novamente.';
      }
      Alert.alert('Erro', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1D854C" barStyle="light-content" />
       <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
            <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            >
            <Ionicons name="arrow-back-outline" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Recuperar Senha</Text>
            <View style={styles.rightSpace} />
        </View>

        <ScrollView contentContainerStyle={{flexGrow: 1}}>
            <View style={styles.contentInner}>

            <Ionicons name="lock-open-outline" size={80} color="#1D854C" style={{alignSelf: 'center', marginBottom: 25}}/>

            <Text style={styles.pageTitle}>Esqueceu sua senha?</Text>
            <Text style={styles.pageSubtitle}>
                Sem problemas! Insira seu e-mail abaixo e enviaremos um link para você criar uma nova senha.
            </Text>

            <View style={styles.inputWrapper}>
                <MaterialIcons name="alternate-email" size={22} color="#4A5568" style={styles.inputIcon} />
                <TextInput
                style={styles.input}
                placeholder="Seu endereço de e-mail cadastrado"
                placeholderTextColor="#A0AEC0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                />
            </View>

            <TouchableOpacity
                style={[styles.actionButton, isLoading && styles.buttonDisabled]}
                onPress={handleRecover}
                activeOpacity={0.8}
                disabled={isLoading}
            >
                {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                <Text style={styles.actionButtonText}>ENVIAR INSTRUÇÕES</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')}
                disabled={isLoading}
            >
                <Text style={styles.loginLinkText}>
                Lembrou a senha? <Text style={styles.loginLinkTextBold}>Voltar para Login</Text>
                </Text>
            </TouchableOpacity>
            </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ESTILOS MODERNIZADOS (Reutilizar e adaptar da LoginScreen)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    height: 60, backgroundColor: '#1D854C', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, elevation: 4,
  },
  backButton: { padding: 8 },
  rightSpace: { width: 40 },
  headerTitle: { fontSize: 20, color: '#FFFFFF', fontWeight: '600' },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  contentInner: { padding: 24, alignItems: 'center' },
  logoImage: { width: 100, height: 100, marginBottom: 30 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 12, textAlign: 'center' },
  pageSubtitle: {
    fontSize: 15, color: '#6B7280', textAlign: 'center',
    marginBottom: 35, lineHeight: 22, paddingHorizontal: 10,
  },
  inputWrapper: { // Mesmo estilo da LoginScreen
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 10, marginBottom: 25, borderWidth: 1,
    borderColor: '#E2E8F0', height: 54, paddingHorizontal: 5, width: '100%',
  },
  inputIcon: { paddingHorizontal: 12 },
  input: { flex: 1, height: '100%', color: '#1A202C', fontSize: 16 },
  
  actionButton: { // Mesmo estilo do loginButton da LoginScreen
    backgroundColor: '#1D854C', borderRadius: 10, height: 52,
    justifyContent: 'center', alignItems: 'center', marginBottom: 25,
    elevation: 2, shadowColor: '#052e16', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 3, width: '100%',
  },
  buttonDisabled: { backgroundColor: '#A5D6A7' },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  
  loginLink: { marginTop: 10, marginBottom: 24 },
  loginLinkText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
  loginLinkTextBold: { color: '#1D854C', fontWeight: 'bold' },
});