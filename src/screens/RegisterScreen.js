import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  ScrollView, SafeAreaView, StatusBar, ActivityIndicator, Alert, Platform, KeyboardAvoidingView
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { FIREBASE_AUTH, FIREBASE_DB } from '../firebaseConnection';
import { ref, set, serverTimestamp } from 'firebase/database';
import { Picker } from '@react-native-picker/picker';

const USER_ROLES = [
    { label: 'Selecione seu tipo de conta...', value: '' },
    { label: 'Sou Aluno(a)', value: 'aluno' },
    { label: 'Sou Professor(a)', value: 'professor' },
    { label: 'Sou Psicopedagogo(a)', value: 'psicopedagogo' },
];

export const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(USER_ROLES[0].value);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password || !confirmPassword || !role) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha todos os campos, incluindo o tipo de conta.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erro de Senha', 'As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
        Alert.alert('Senha Fraca', 'A senha deve ter pelo menos 6 caracteres.');
        return;
    }


    setIsRegistering(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        FIREBASE_AUTH,
        email.trim(),
        password
      );
      const user = userCredential.user;

      await updateProfile(user, { displayName: name.trim() });

      const userDbRef = ref(FIREBASE_DB, `users/${user.uid}`);
      await set(userDbRef, {
        uid: user.uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: role,
        isAdmin: false,
        createdAt: serverTimestamp(),
        profileImageUrl: null,
      });

    } catch (error) {
      console.error("Erro no registro:", error.code, error.message);
      let errorMessage = 'Não foi possível criar a conta. Tente novamente.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este endereço de e-mail já está em uso por outra conta.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'O formato do email é inválido.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
      }
       else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Erro de rede. Verifique sua conexão e tente novamente.';
      }
      Alert.alert('Erro no Cadastro', errorMessage);
    } finally {
      setIsRegistering(false);
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
            <Text style={styles.headerTitle}>Criar Nova Conta</Text>
            <View style={styles.rightSpace} /> 
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.contentInner}>
            
            <Text style={styles.formSectionTitle}>Informações Pessoais</Text>

            <View style={styles.inputWrapper}>
                <MaterialIcons name="person-outline" size={22} color="#4A5568" style={styles.inputIcon} />
                <TextInput
                style={styles.input}
                placeholder="Nome completo"
                placeholderTextColor="#A0AEC0"
                value={name}
                onChangeText={setName}
                />
            </View>

            <View style={styles.inputWrapper}>
                <MaterialIcons name="alternate-email" size={22} color="#4A5568" style={styles.inputIcon} />
                <TextInput
                style={styles.input}
                placeholder="Seu melhor e-mail"
                placeholderTextColor="#A0AEC0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                />
            </View>

            <View style={styles.inputWrapper}>
                <MaterialIcons name="phone-iphone" size={22} color="#4A5568" style={styles.inputIcon} />
                <TextInput
                style={styles.input}
                placeholder="Número de telefone (com DDD)"
                placeholderTextColor="#A0AEC0"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                />
            </View>

            <View style={styles.inputField}>
                <Text style={styles.inputLabel}>Tipo de Conta *</Text>
                <View style={styles.pickerWrapper}>
                    <Picker
                        selectedValue={role}
                        onValueChange={(itemValue, itemIndex) => setRole(itemValue)}
                        style={styles.picker}
                        dropdownIconColor="#1D854C" 
                        mode="dropdown"
                    >
                        {USER_ROLES.map((r) => (
                            <Picker.Item key={r.value} label={r.label} value={r.value} enabled={r.value !== ''} style={r.value === '' ? styles.pickerPlaceholderItem : {}}/>
                        ))}
                    </Picker>
                </View>
            </View>


            <Text style={[styles.formSectionTitle, {marginTop: 10}]}>Segurança da Conta</Text>

            <View style={styles.inputWrapper}>
                <MaterialIcons name="lock-outline" size={22} color="#4A5568" style={styles.inputIcon} />
                <TextInput
                style={styles.input}
                placeholder="Crie uma senha forte"
                placeholderTextColor="#A0AEC0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                />
                 <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={24} color="#6B7280" />
                </TouchableOpacity>
            </View>

            <View style={styles.inputWrapper}>
                <MaterialIcons name="lock-outline" size={22} color="#4A5568" style={styles.inputIcon} />
                <TextInput
                style={styles.input}
                placeholder="Confirme sua senha"
                placeholderTextColor="#A0AEC0"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={24} color="#6B7280" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[styles.actionButton, isRegistering && styles.buttonDisabled]}
                onPress={handleRegister}
                activeOpacity={0.8}
                disabled={isRegistering}
            >
                {isRegistering ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                    <Text style={styles.actionButtonText}>CRIAR MINHA CONTA</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={styles.loginLink}
                disabled={isRegistering}
            >
                <Text style={styles.loginLinkText}>
                Já possui uma conta? <Text style={styles.loginLinkTextBold}>Faça login</Text>
                </Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 4,
  },
  backButton: { padding: 8 },
  rightSpace: { width: 40 },
  headerTitle: { fontSize: 20, color: '#FFFFFF', fontWeight: '600' },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  contentInner: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  formSectionTitle: {
    alignSelf: 'flex-start',
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
    marginTop: 10,
  },
  inputField: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 15,
    color: '#4A5568',
    marginBottom: 8,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 10, marginBottom: 18, borderWidth: 1,
    borderColor: '#E2E8F0', height: 54, paddingHorizontal: 5, width: '100%',
  },
  inputIcon: { paddingHorizontal: 12 },
  input: { flex: 1, height: '100%', color: '#1A202C', fontSize: 16, paddingRight: 10 },
  eyeIcon: { paddingHorizontal: 12 },
  
  pickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 54, 
    justifyContent: 'center',
    width: '100%',
  },
  picker: {
    height: '100%', 
    width: '100%',
    color: '#1A202C', 
  },
  pickerPlaceholderItem: { 
    color: '#A0AEC0',
    // fontSize: 16,
  },

  actionButton: {
    backgroundColor: '#1D854C', borderRadius: 10, height: 52,
    justifyContent: 'center', alignItems: 'center', marginTop: 25,
    elevation: 2, shadowColor: '#052e16', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 3, width: '100%',
  },
  buttonDisabled: { backgroundColor: '#A5D6A7' },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  
  loginLink: { marginTop: 20, marginBottom: 24, alignSelf: 'center' },
  loginLinkText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
  loginLinkTextBold: { color: '#1D854C', fontWeight: 'bold' },
});