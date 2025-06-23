import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Alert, ActivityIndicator
} from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { FIREBASE_DB } from '../firebaseConnection';
import { ref as dbRef, push, update, serverTimestamp, get, query, orderByChild } from 'firebase/database';
import { useAuth } from '../AuthContext';

const applyDateMask = (value) => {
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly.length <= 2) {
    return digitsOnly;
  }
  if (digitsOnly.length <= 4) {
    return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
  }
  return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
};

const CustomPicker = ({ label, options, selectedValue, onValueChange, disabled }) => {
  const [showOptions, setShowOptions] = useState(false);
  const selectedOptionObject = options.find(opt => opt.value === selectedValue);
  return (
    <View style={[styles.inputField, { zIndex: showOptions ? 10 : 1 }]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity onPress={() => !disabled && setShowOptions(!showOptions)} style={[styles.pickerButton, disabled && styles.disabledInput]}>
        <Text style={[styles.pickerButtonText, disabled && styles.disabledText]}>
          {selectedOptionObject ? selectedOptionObject.label : 'Selecione...'}
        </Text>
        <Ionicons name={showOptions ? "chevron-up-outline" : "chevron-down-outline"} size={22} color={disabled ? "#A0AEC0" : "#555"} />
      </TouchableOpacity>
      {showOptions && !disabled && (
        <View style={styles.pickerOptionsContainer}>
          {options.map(option => (
            <TouchableOpacity key={option.value} style={styles.pickerOption} onPress={() => { onValueChange(option.value); setShowOptions(false); }}>
              <Text>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export const NewTaskModal = ({ isVisible, onClose, onTaskSaved, existingTask }) => {
  const { userData } = useAuth();
  const [taskId, setTaskId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [webDueDateString, setWebDueDateString] = useState('');
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [priority, setPriority] = useState('media');
  const [status, setStatus] = useState('pending');
  const [assignedToSearch, setAssignedToSearch] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState({});
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const isEditing = !!existingTask;
  const isCreator = isEditing && existingTask?.createdByUid === userData?.uid;
  const formDisabled = isLoadingForm || status === 'completed' || status === 'cancelled';
  const reasonDisabled = status === 'completed' ? ' (Concluída)' : status === 'cancelled' ? ' (Cancelada)' : '';

  useEffect(() => {
    if (isVisible) {
      if (isEditing && existingTask) {
        setTaskId(existingTask.id);
        setTitle(existingTask.title || '');
        setDescription(existingTask.description || '');
        const initialDate = existingTask.dueDate ? new Date(existingTask.dueDate + "T00:00:00") : new Date();
        setDueDate(initialDate);
        setWebDueDateString(applyDateMask(initialDate.toLocaleDateString('pt-BR')));
        setPriority(existingTask.priority || 'media');
        setStatus(existingTask.status || 'pending');
        setAssignedUsers(existingTask.assignedTo || {});
      } else {
        resetFormFields();
      }
      setFoundUsers([]);
      setAssignedToSearch('');
    }
  }, [existingTask, isVisible, isEditing]);

  const resetFormFields = () => {
    setTaskId(null); setTitle(''); setDescription('');
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    setDueDate(tomorrow);
    setWebDueDateString(applyDateMask(tomorrow.toLocaleDateString('pt-BR')));
    setPriority('media'); setStatus('pending'); setAssignedToSearch(''); setFoundUsers([]);
    setAssignedUsers({}); setIsLoadingForm(false);
  };

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);
  const handleDateConfirm = (selectedDate) => { setDueDate(selectedDate); hideDatePicker(); };

  const handleWebDateChange = (text) => {
    const parts = text.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (day?.length === 2 && month?.length === 2 && year?.length === 4) {
        const newDate = new Date(`${year}-${month}-${day}T00:00:00`);
        if (!isNaN(newDate.getTime())) {
          setDueDate(newDate);
        }
      }
    }
  };

  const priorityOptions = [{ label: 'Alta', value: 'alta' }, { label: 'Média', value: 'media' }, { label: 'Baixa', value: 'baixa' },];
  const statusOptions = [{ label: 'Pendente', value: 'pending' }, { label: 'Em Progresso', value: 'in_progress' }, { label: 'Concluída', value: 'completed' }, { label: 'Cancelada', value: 'cancelled' },];

  const handleSearchUsers = async () => {
    if (assignedToSearch.trim().length < 3) { setFoundUsers([]); return; }
    setIsSearchingUsers(true);
    try {
      const usersRef = query(dbRef(FIREBASE_DB, 'users'), orderByChild('name'));
      const snapshot = await get(usersRef);
      let users = [];
      if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
          const uData = childSnapshot.val();
          if (uData.name && uData.name.toLowerCase().includes(assignedToSearch.toLowerCase())) {
            if (!assignedUsers[childSnapshot.key]) {
              users.push({ id: childSnapshot.key, name: uData.name, email: uData.email, avatarUrl: uData.profileImageUrl });
            }
          }
        });
      }
      setFoundUsers(users);
    } catch (error) { Alert.alert("Erro", "Falha ao buscar usuários.") }
    finally { setIsSearchingUsers(false); }
  };

  const toggleUserAssignment = (user) => {
    setAssignedUsers(prev => {
      const newAssigned = { ...prev };
      if (newAssigned[user.id]) { delete newAssigned[user.id]; }
      else { newAssigned[user.id] = { name: user.name, avatarUrl: user.avatarUrl || null }; }
      return newAssigned;
    });
    setFoundUsers(prev => prev.filter(u => u.id !== user.id));
    setAssignedToSearch('');
  };

  const handleSaveTask = async () => {
    if (!title.trim()) { Alert.alert('Erro', 'Título da tarefa é obrigatório.'); return; }
    if (!userData || !userData.uid) { Alert.alert('Erro', 'Usuário não autenticado.'); return; }
    setIsLoadingForm(true);
    const taskData = {
      title: title.trim(), description: description.trim(),
      dueDate: dueDate.toISOString().split('T')[0], priority, status,
      assignedTo: assignedUsers, updatedAt: serverTimestamp(),
    };
    try {
      if (isEditing && taskId) {
        taskData.createdByUid = existingTask.createdByUid; taskData.createdByName = existingTask.createdByName;
        taskData.createdAt = existingTask.createdAt;
        await update(dbRef(FIREBASE_DB, `tasks/${taskId}`), taskData);
        Alert.alert('Sucesso', 'Tarefa atualizada!');
      } else {
        taskData.createdByUid = userData.uid; taskData.createdByName = userData.name || 'Desconhecido';
        taskData.createdAt = serverTimestamp();
        await push(dbRef(FIREBASE_DB, 'tasks'), taskData);
        Alert.alert('Sucesso', 'Tarefa criada!');
      }
      if (onTaskSaved) onTaskSaved();
      onClose();
    } catch (error) {
      Alert.alert('Erro', `Não foi possível ${isEditing ? 'atualizar' : 'criar'} a tarefa.`);
    } finally { setIsLoadingForm(false); }
  };

  return (
    <Modal isVisible={isVisible} onSwipeComplete={formDisabled ? null : onClose} swipeDirection={formDisabled ? [] : ['down']} onBackdropPress={formDisabled ? null : onClose} onModalHide={resetFormFields} style={styles.modal} avoidKeyboard>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}</Text>
          <TouchableOpacity onPress={formDisabled ? null : onClose} disabled={formDisabled}>
            <Ionicons name="close-outline" size={28} color={formDisabled ? "#A0AEC0" : "#333"} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.formContainer}>
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Título da Tarefa *{reasonDisabled}</Text>
              <TextInput style={[styles.input, formDisabled && styles.disabledInput]} value={title} onChangeText={setTitle} placeholder="Ex: Preparar material da aula" editable={!formDisabled} placeholderTextColor="#A0AEC0" />
            </View>
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Descrição (opcional)</Text>
              <TextInput style={[styles.input, styles.textArea, formDisabled && styles.disabledInput]} value={description} onChangeText={setDescription} placeholder="Adicionar detalhes, subtarefas..." multiline editable={!formDisabled} placeholderTextColor="#A0AEC0" />
            </View>
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Prazo de Conclusão *</Text>
              {Platform.OS === 'web' ? (
                <TextInput
                  style={[styles.input, formDisabled && styles.disabledInput]}
                  placeholder="DD/MM/AAAA"
                  value={webDueDateString}
                  onChangeText={(text) => setWebDueDateString(applyDateMask(text))}
                  onBlur={() => handleWebDateChange(webDueDateString)}
                  maxLength={10}
                  editable={!formDisabled}
                  placeholderTextColor="#A0AEC0"
                />
              ) : (
                <TouchableOpacity onPress={showDatePicker} style={[styles.datePickerButton, formDisabled && styles.disabledInput]} disabled={formDisabled}>
                  <Ionicons name="calendar-outline" size={20} color={formDisabled ? "#A0AEC0" : "#4A5568"} style={{ marginRight: 10 }} />
                  <Text style={[styles.datePickerText, formDisabled && styles.disabledText]}>{dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.rowFields, { zIndex: 1 }]}>
              <View style={{ flex: 1, marginRight: isEditing ? 10 : 0 }}>
                <CustomPicker label="Prioridade" options={priorityOptions} selectedValue={priority} onValueChange={setPriority} disabled={formDisabled} />
              </View>
              {isEditing && (<View style={{ flex: 1, marginLeft: 10 }}><CustomPicker label="Status" options={statusOptions} selectedValue={status} onValueChange={setStatus} disabled={!isCreator} /></View>)}
            </View>
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Atribuir para</Text>
              <View style={styles.assignedSearchContainer}>
                <TextInput style={[styles.input, { flex: 1, marginRight: 8 }, formDisabled && styles.disabledInput]} value={assignedToSearch} onChangeText={setAssignedToSearch} placeholder="Buscar por nome..." editable={!formDisabled} placeholderTextColor="#A0AEC0" />
                <TouchableOpacity onPress={handleSearchUsers} style={[styles.searchUserButton, (isSearchingUsers || formDisabled) && styles.disabledInput]} disabled={isSearchingUsers || formDisabled}>
                  {isSearchingUsers ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search-outline" size={24} color={formDisabled ? "#A0AEC0" : "#fff"} />}
                </TouchableOpacity>
              </View>
              {foundUsers.length > 0 && (
                <View style={styles.foundUsersListContainer}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 130 }}>
                    {foundUsers.map(item => (
                      <TouchableOpacity key={item.id} style={styles.userToAssignItem} onPress={() => toggleUserAssignment(item)} disabled={formDisabled}>
                        <Text style={styles.userToAssignText}>{item.name} ({item.email})</Text>
                        <Ionicons name={"square-outline"} size={22} color="#1D854C" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {Object.keys(assignedUsers).length > 0 && (
                <View style={styles.assignedUsersChipsContainer}>
                  <Text style={styles.assignedUsersTitle}>Designado(s):</Text>
                  <View style={styles.chipsWrapper}>
                    {Object.entries(assignedUsers).map(([uid, uData]) => (
                      <View key={uid} style={styles.assignedUserChip}>
                        <Text style={styles.assignedUserName}>{uData.name}</Text>
                        <TouchableOpacity onPress={() => toggleUserAssignment({ id: uid, ...uData })} style={{ marginLeft: 6 }} disabled={formDisabled}><Ionicons name="close-circle-outline" size={18} color="#D32F2F" /></TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
            <TouchableOpacity style={[styles.confirmButton, formDisabled && styles.confirmButtonDisabled]} onPress={handleSaveTask} disabled={formDisabled}>
              {isLoadingForm ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>{isEditing ? 'Salvar Alterações' : 'Criar Tarefa'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
        {Platform.OS !== 'web' && (
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            date={dueDate}
            onConfirm={handleDateConfirm}
            onCancel={hideDatePicker}
            minimumDate={new Date(new Date().setDate(new Date().getDate() - 1))}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  modalContent: { backgroundColor: '#FFFFFF', paddingTop: 15, borderTopRightRadius: 25, borderTopLeftRadius: 25, maxHeight: '90%', paddingBottom: Platform.OS === 'ios' ? 30 : 10, },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 15, paddingHorizontal: 20, marginBottom: 10, },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  formContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  inputField: { marginBottom: 20 },
  inputLabel: { fontSize: 15, color: '#4A5568', marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: '#F7F8FC', borderRadius: 10, minHeight: 52, paddingHorizontal: 15, fontSize: 16, color: '#2D3748', borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 12, },
  disabledInput: { backgroundColor: '#E5E7EB' },
  disabledText: { color: '#9CA3AF' },
  textArea: { textAlignVertical: 'top', paddingTop: 15, height: 100 },
  datePickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FC', borderRadius: 10, height: 52, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E2E8F0', },
  datePickerText: { fontSize: 16, color: '#2D3748' },
  rowFields: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, },
  confirmButton: { backgroundColor: '#1D854C', borderRadius: 10, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 25, elevation: 2, },
  confirmButtonDisabled: { backgroundColor: '#A5D6A7' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  pickerButton: { backgroundColor: '#F7F8FC', borderRadius: 10, height: 52, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', },
  pickerButtonText: { fontSize: 16, color: '#2D3748' },
  pickerOptionsContainer: { backgroundColor: '#FFFFFF', borderRadius: 8, marginTop: 4, borderColor: '#E2E8F0', borderWidth: 1, elevation: 5, zIndex: 10, position: 'absolute', width: '100%', top: 80, },
  pickerOption: { paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  assignedSearchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  searchUserButton: { backgroundColor: '#1D854C', paddingHorizontal: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center', height: 52, },
  foundUsersListContainer: { borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 8, backgroundColor: '#fff', marginTop: 8, },
  userToAssignItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', },
  userToAssignText: { fontSize: 15, color: '#374151' },
  assignedUsersChipsContainer: { marginTop: 15 },
  assignedUsersTitle: { fontSize: 14, fontWeight: '600', color: '#10502F', marginBottom: 10 },
  chipsWrapper: { flexDirection: 'row', flexWrap: 'wrap' },
  assignedUserChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2FE', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 8, },
  assignedUserName: { color: '#0C4A6E', fontWeight: '500', fontSize: 14 },
});