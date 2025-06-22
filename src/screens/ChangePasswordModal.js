import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Platform, ScrollView
} from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import { FIREBASE_AUTH } from '../firebaseConnection'; // Ajuste o caminho
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

export const ChangePasswordModal = ({ isVisible, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha todos os campos.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Erro', 'A nova senha e a confirmação não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Senha Fraca', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    const user = FIREBASE_AUTH.currentUser;

    if (user) {
      try {
        // Reautenticar o usuário com a senha atual
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        // Se a reautenticação for bem-sucedida, atualizar a senha
        await updatePassword(user, newPassword);

        Alert.alert('Sucesso', 'Senha alterada com sucesso!');
        resetForm();
        onClose();
      } catch (error) {
        console.error('Erro ao alterar senha:', error);
        let errorMessage = 'Não foi possível alterar a senha.';
        if (error.code === 'auth/wrong-password') {
          errorMessage = 'A senha atual está incorreta.';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'A nova senha é muito fraca.';
        } else if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'Esta operação é sensível e requer login recente. Por favor, faça login novamente e tente de novo.';
        }
        Alert.alert('Erro', errorMessage);
      } finally {
        setIsLoading(false);
      }
    } else {
      Alert.alert('Erro', 'Usuário não encontrado. Por favor, faça login novamente.');
      setIsLoading(false);
      onClose(); // Fechar o modal se não houver usuário
    }
  };

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <Modal
      isVisible={isVisible}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      onBackdropPress={onClose}
      onModalHide={resetForm}
      style={styles.modal}
      avoidKeyboard
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Alterar Senha</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close-outline" size={28} color="#333" />
          </TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.formContainer}>
            <Text style={styles.infoText}>
              Para sua segurança, você precisará confirmar sua senha atual antes de definir uma nova.
            </Text>

            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Senha Atual</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Sua senha atual"
                    secureTextEntry={!showCurrentPassword}
                    placeholderTextColor="#A0AEC0"
                />
                <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.eyeIcon}>
                    <Ionicons name={showCurrentPassword ? "eye-outline" : "eye-off-outline"} size={24} color="#6B7280"/>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Nova Senha</Text>
               <View style={styles.passwordInputContainer}>
                <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Mínimo 6 caracteres"
                    secureTextEntry={!showNewPassword}
                    placeholderTextColor="#A0AEC0"
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                    <Ionicons name={showNewPassword ? "eye-outline" : "eye-off-outline"} size={24} color="#6B7280"/>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Confirmar Nova Senha</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                    style={styles.input}
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    placeholder="Repita a nova senha"
                    secureTextEntry={!showConfirmPassword}
                    placeholderTextColor="#A0AEC0"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                    <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={24} color="#6B7280"/>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
                style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]} 
                onPress={handleChangePassword} 
                disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirmar Alteração</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  modalContent: {
    backgroundColor: '#FFFFFF', paddingTop: 15, borderTopRightRadius: 25,
    borderTopLeftRadius: 25, maxHeight: '80%', paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 15, paddingHorizontal: 20, marginBottom: 10,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  formContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  infoText: {
    fontSize: 14,
    color: '#4B5563', // Tailwind gray-600
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputField: { marginBottom: 20 },
  inputLabel: { fontSize: 15, color: '#4A5568', marginBottom: 8, fontWeight: '500' },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1, // Para o input ocupar o espaço disponível
    height: 52,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#2D3748',
  },
  eyeIcon: {
    padding: 12, // Aumenta a área de toque
  },
  confirmButton: {
    backgroundColor: '#1D854C', borderRadius: 10, height: 52,
    justifyContent: 'center', alignItems: 'center', marginTop: 25, elevation: 2,
  },
  confirmButtonDisabled: { backgroundColor: '#A5D6A7' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});