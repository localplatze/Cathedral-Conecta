// ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView, StatusBar,
  StyleSheet, Alert, ScrollView, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FIREBASE_AUTH, FIREBASE_DB } from '../firebaseConnection'; 
import { ref as dbRef, update } from 'firebase/database';
import { updateProfile, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useAuth } from '../AuthContext'; 
import { ChangePasswordModal } from './ChangePasswordModal';

export const ProfileScreen = ({ navigation }) => {
  const { userData: contextUserData, logout, fetchUserDataFromDB } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPasswordForEmailChange, setCurrentPasswordForEmailChange] = useState('');
  const [isChangePasswordModalVisible, setIsChangePasswordModalVisible] = useState(false);

  useEffect(() => {
    if (contextUserData) {
      setName(contextUserData.name || FIREBASE_AUTH.currentUser?.displayName || '');
      setEmail(contextUserData.email || FIREBASE_AUTH.currentUser?.email || '');
      setPhone(contextUserData.phone || '');
    } else if (FIREBASE_AUTH.currentUser) {
        setName(FIREBASE_AUTH.currentUser.displayName || '');
        setEmail(FIREBASE_AUTH.currentUser.email || '');
    }
  }, [contextUserData]);

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
        Alert.alert('Campo Obrigatório', 'O nome não pode estar vazio.');
        return;
    }
    if (!FIREBASE_AUTH.currentUser) {
        Alert.alert('Erro', 'Usuário não autenticado.');
        return;
    }
    setIsLoading(true);

    const currentUser = FIREBASE_AUTH.currentUser;
    const updates = {};
    const authUpdates = {};

    const currentAuthDisplayName = currentUser.displayName;
    const currentContextName = contextUserData?.name;
    const currentAuthEmail = currentUser.email;
    const currentContextPhone = contextUserData?.phone;

    if (name !== (currentContextName || currentAuthDisplayName)) {
      updates.name = name.trim();
      authUpdates.displayName = name.trim();
    }
    if (phone !== currentContextPhone) {
      updates.phone = phone.trim();
    }
    
    if (email.trim().toLowerCase() !== currentAuthEmail.toLowerCase()) {
        if (!currentPasswordForEmailChange) {
            Alert.prompt(
                "Alterar Email",
                "Para sua segurança, por favor, insira sua senha atual para alterar o email.",
                [
                    { text: "Cancelar", style: "cancel", onPress: () => setIsLoading(false) },
                    { 
                        text: "Confirmar", 
                        onPress: password => {
                            if (password) {
                                setCurrentPasswordForEmailChange(password); 
                                Alert.alert(
                                    "Senha Inserida", 
                                    "Por favor, clique em 'Salvar Alterações' novamente para confirmar a mudança de e-mail."
                                );
                            } else {
                                Alert.alert("Senha Obrigatória", "A senha é necessária para alterar o email.");
                            }
                            setIsLoading(false);
                        }
                    },
                ],
                'secure-text'
            );
            return; 
        }

        try {
            const credential = EmailAuthProvider.credential(currentAuthEmail, currentPasswordForEmailChange);
            await reauthenticateWithCredential(currentUser, credential);
            await updateEmail(currentUser, email.trim()); 
            updates.email = email.trim().toLowerCase(); 
            setCurrentPasswordForEmailChange(''); 
            Alert.alert("Email Atualizado", "Seu email foi alterado com sucesso. Pode ser necessário fazer login novamente com o novo e-mail.");
        } catch (error) {
            console.error("Erro ao reautenticar ou atualizar email:", error);
            let errorMessage = "Não foi possível atualizar o email. Verifique sua senha.";
            if(error.code === 'auth/wrong-password') errorMessage = "Senha atual incorreta.";
            else if(error.code === 'auth/email-already-in-use') errorMessage = "Este email já está em uso por outra conta.";
            else if(error.code === 'auth/invalid-email') errorMessage = "O formato do email é inválido.";
            else if (error.code === 'auth/requires-recent-login') errorMessage = "Esta operação é sensível e requer login recente. Por favor, faça login novamente.";
            
            Alert.alert("Erro de Email", errorMessage);
            setIsLoading(false);
            setCurrentPasswordForEmailChange('');
            return;
        }
    }

    try {
      let profileUpdated = false;
      if (Object.keys(authUpdates).length > 0) {
        await updateProfile(currentUser, authUpdates);
        profileUpdated = true;
      }
      if (Object.keys(updates).length > 0) {
        const userDbRef = dbRef(FIREBASE_DB, `users/${currentUser.uid}`);
        await update(userDbRef, updates);
        profileUpdated = true;
      }

      if (profileUpdated) {
        Alert.alert('Sucesso', 'Perfil atualizado!');
        if (fetchUserDataFromDB) {
            await fetchUserDataFromDB(currentUser.uid);
        }
      } else {
        Alert.alert('Informação', 'Nenhuma alteração detectada para salvar.');
      }
      setIsEditing(false); 
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o perfil.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutPress = () => {
    const performLogout = async () => {
        try {
            if (logout) {
                await logout();
            } else {
                console.error("Função de logout não encontrada no AuthContext.");
                await FIREBASE_AUTH.signOut();
            }
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            Alert.alert("Erro", "Não foi possível sair da sua conta no momento.");
        }
    };

    if (Platform.OS === 'web') {
        // Na web, usamos o confirm nativo do navegador.
        if (window.confirm("Você tem certeza que deseja sair?")) {
            performLogout();
        }
    } else {
        // Em mobile (iOS/Android), usamos o Alert nativo do React Native.
        Alert.alert(
            "Sair da Conta",
            "Você tem certeza que deseja sair?",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Sair", 
                    style: "destructive",
                    onPress: performLogout // Chama a função aqui
                }
            ],
            { cancelable: true }
        );
    }
};

  if (!contextUserData && !FIREBASE_AUTH.currentUser) { 
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1D854C" />
            </View>
        </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1D854C" barStyle="light-content" />
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back-outline" size={26} color="#FFFFFF"/>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.headerButton}>
          <Ionicons name={isEditing ? "close-circle-outline" : "create-outline"} size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Seção do Avatar REMOVIDA */}
        <View style={styles.profileInfoDirect}>
            <Text style={styles.profileName}>{name || 'Carregando nome...'}</Text>
            <Text style={styles.profileEmail}>{email || 'Carregando email...'}</Text>
        </View>


        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Informações Pessoais</Text>
          
           <View style={styles.inputGroup}>
            <Ionicons name="person-outline" size={22} color="#4A5568" style={styles.inputIcon}/>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              placeholder="Nome completo"
              value={name}
              onChangeText={setName}
              editable={isEditing}
              placeholderTextColor="#A0AEC0"
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons name="mail-outline" size={22} color="#4A5568" style={styles.inputIcon}/>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              placeholder="Endereço de e-mail"
              value={email}
              onChangeText={setEmail}
              editable={isEditing}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#A0AEC0"
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons name="call-outline" size={22} color="#4A5568" style={styles.inputIcon}/>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              placeholder="Número de telefone (opcional)"
              value={phone}
              onChangeText={setPhone}
              editable={isEditing}
              keyboardType="phone-pad"
              placeholderTextColor="#A0AEC0"
            />
          </View>

          {isEditing && (
            <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Salvar Alterações</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Conta</Text>
            <TouchableOpacity style={styles.actionButton} onPress={() => setIsChangePasswordModalVisible(true)}> 
                <Ionicons name="lock-closed-outline" size={22} color="#4A5568" style={styles.actionIcon}/>
                <Text style={styles.actionButtonText}>Alterar Senha</Text>
                <Ionicons name="chevron-forward-outline" size={22} color="#CBD5E0"/>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogoutPress}>
                <Ionicons name="log-out-outline" size={22} color="#EF4444" style={styles.actionIcon}/>
                <Text style={[styles.actionButtonText, styles.logoutButtonText]}>Sair da Conta</Text>
            </TouchableOpacity>
        </View>
      </ScrollView>

      <ChangePasswordModal
        isVisible={isChangePasswordModalVisible}
        onClose={() => setIsChangePasswordModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    height: 60,
    backgroundColor: '#1D854C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    elevation: 4,
  },
  headerButton: { padding: 10 },
  headerTitle: { fontSize: 20, color: '#FFFFFF', fontWeight: '600' },
  scrollContent: {
    paddingBottom: 40,
  },
  profileInfoDirect: {
    alignItems: 'center',
    paddingVertical: 25,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 20,
  },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#1A202C', marginBottom: 6 },
  profileEmail: { fontSize: 16, color: '#6B7280' },

  formSection: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 18, marginTop: 10 },
  inputGroup: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB',
    marginBottom: 18, paddingHorizontal: 12, height: 54,
  },
  inputIcon: { marginRight: 12, },
  input: {
    flex: 1, height: '100%', fontSize: 16, color: '#1F2937',
  },
  inputDisabled: { color: '#6B7280', backgroundColor: '#F3F4F6' },
  
  saveButton: {
    backgroundColor: '#1D854C', borderRadius: 10, height: 52,
    justifyContent: 'center', alignItems: 'center', marginTop: 15, elevation: 2,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  actionsSection: { paddingHorizontal: 20, marginTop: 10, },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    paddingVertical: 18, paddingHorizontal: 15, borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12,
  },
  actionIcon: { marginRight: 15 },
  actionButtonText: { flex: 1, fontSize: 16, color: '#374151', fontWeight: '500'},
  logoutButton: { borderColor: '#FCA5A5' },
  logoutButtonText: { color: '#EF4444' },
});