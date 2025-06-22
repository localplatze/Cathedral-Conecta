import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Alert, ActivityIndicator
} from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { FIREBASE_DB } from '../firebaseConnection';
import { ref as dbRef, push, update, serverTimestamp, query, orderByChild, get } from 'firebase/database';
import { useAuth } from '../AuthContext';

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

export const NewEventModal = ({ isVisible, onClose, onEventSaved, existingEvent }) => { 
  const { userData } = useAuth(); 

  const [eventId, setEventId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);
  const [eventType, setEventType] = useState('presencial');
  const [location, setLocation] = useState('');
  const [guestsSearch, setGuestsSearch] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [selectedGuests, setSelectedGuests] = useState({}); 
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  const isEditing = !!existingEvent;
  const isCreator = isEditing && existingEvent?.createdBy === userData?.uid;
  const formDisabled = isLoadingForm || status !== 'active';
  const reasonDisabled = status === 'concluded' ? ' (Evento Concluído)' : status === 'cancelled' ? ' (Evento Cancelado)' : '';

  useEffect(() => {
    if (isVisible) { 
      if (isEditing && existingEvent) {
        setEventId(existingEvent.id);
        setTitle(existingEvent.title || '');
        setDescription(existingEvent.description || ''); 
        setStatus(existingEvent.status || 'active');
        setDate(existingEvent.date ? new Date(existingEvent.date + "T00:00:00") : new Date()); 
        if (existingEvent.time) {
            const [hours, minutes] = existingEvent.time.split(':');
            const newTime = new Date(); newTime.setHours(parseInt(hours, 10)); newTime.setMinutes(parseInt(minutes, 10)); setTime(newTime);
        } else { setTime(new Date()); }
        setEventType(existingEvent.isOnline ? 'online' : 'presencial');
        setLocation(existingEvent.location || '');
        const attendeesFormatted = {};
        if (existingEvent.attendees) {
            Object.entries(existingEvent.attendees).forEach(([uid, guestData]) => {
                attendeesFormatted[uid] = { name: guestData.name, avatarUrl: guestData.avatarUrl || null };
            });
        }
        setSelectedGuests(attendeesFormatted);
      } else { 
        resetFormFields(); 
      }
      setFoundUsers([]); 
      setGuestsSearch(''); 
    }
  }, [isVisible, existingEvent, isEditing, userData]); 

  const resetFormFields = () => {
    setEventId(null); setTitle(''); setDescription(''); setStatus('active');
    setDate(new Date()); const now = new Date(); now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15); setTime(now);
    setEventType('presencial'); setLocation(''); setGuestsSearch(''); setFoundUsers([]); setIsLoadingForm(false);
    if (userData && userData.uid && userData.name) {
      setSelectedGuests({ [userData.uid]: { name: userData.name, avatarUrl: userData.profileImageUrl || null } });
    } else { setSelectedGuests({}); }
  };

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);
  const handleDateConfirm = (selectedDate) => { setDate(selectedDate); hideDatePicker(); };
  const showTimePicker = () => setTimePickerVisibility(true);
  const hideTimePicker = () => setTimePickerVisibility(false);
  const handleTimeConfirm = (selectedTime) => { setTime(selectedTime); hideTimePicker(); };

  const handleSearchUsers = async () => {
    if (guestsSearch.trim().length < 3) { setFoundUsers([]); return; }
    setIsSearchingUsers(true);
    try {
      const usersRef = query(dbRef(FIREBASE_DB, 'users'), orderByChild('name'));
      const snapshot = await get(usersRef);
      const users = [];
      if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
          const uData = childSnapshot.val();
          if (uData.name && uData.name.toLowerCase().includes(guestsSearch.toLowerCase())) {
            if (childSnapshot.key !== userData.uid && !selectedGuests[childSnapshot.key]) {
                 users.push({ id: childSnapshot.key, name: uData.name, email: uData.email, avatarUrl: uData.profileImageUrl || null });
            }
          }
        });
      }
      setFoundUsers(users);
    } catch (error) { console.error("Erro ao buscar usuários:", error); Alert.alert("Erro", "Falha ao buscar usuários.");}
    finally { setIsSearchingUsers(false); }
  };

  const toggleGuestSelection = (user) => {
    setSelectedGuests(prev => {
        const newGuests = {...prev};
        if (newGuests[user.id]) { delete newGuests[user.id]; } 
        else { newGuests[user.id] = { name: user.name, avatarUrl: user.avatarUrl || null }; }
        return newGuests;
    });
    setFoundUsers(prev => prev.filter(u => u.id !== user.id));
    setGuestsSearch('');
  };

  const handleSaveEvent = async () => {
    if (!title.trim()) { Alert.alert('Campo Obrigatório', 'Por favor, preencha o título do evento.'); return; }
    if (!location.trim() && eventType === 'presencial') { Alert.alert('Campo Obrigatório', 'Informe o local/sala.'); return; }
    if (!userData || !userData.uid) { Alert.alert('Erro', 'Usuário não autenticado.'); return; }

    setIsLoadingForm(true);
    const eventData = {
      title: title.trim(),
      description: description.trim(),
      date: date.toISOString().split('T')[0],
      time: time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isOnline: eventType === 'online',
      location: location.trim(),
      attendees: selectedGuests,
      updatedAt: serverTimestamp(),
    };

    try {
      if (isEditing && eventId) {
        eventData.createdBy = existingEvent.createdBy;
        eventData.creatorName = existingEvent.creatorName;
        eventData.createdAt = existingEvent.createdAt;
        eventData.status = existingEvent.status || 'active';
        await update(dbRef(FIREBASE_DB, `events/${eventId}`), eventData);
        Alert.alert('Sucesso', 'Evento atualizado!');
      } else {
        eventData.createdBy = userData.uid;
        eventData.creatorName = userData.name || 'Desconhecido';
        eventData.createdAt = serverTimestamp();
        eventData.status = 'active';
        await push(dbRef(FIREBASE_DB, 'events'), eventData);
        Alert.alert('Sucesso', 'Evento criado!');
      }
      if(onEventSaved) onEventSaved();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      Alert.alert('Erro', `Não foi possível ${isEditing ? 'atualizar' : 'criar'} o evento.`);
    } finally {
      setIsLoadingForm(false);
    }
  };
  
  const handleUpdateStatus = async (newStatus) => {
    if (!isCreator || !eventId) return;
    const actionText = newStatus === 'concluded' ? 'concluir' : 'cancelar';
    const titleText = newStatus === 'concluded' ? 'Concluir Evento' : 'Cancelar Evento';

    Alert.alert(
      titleText,
      `Tem certeza que deseja ${actionText} este evento?`,
      [
        { text: 'Voltar', style: 'cancel' },
        { 
          text: `Sim, ${actionText}`, 
          style: newStatus === 'cancelled' ? 'destructive' : 'default',
          onPress: async () => {
            setIsLoadingForm(true);
            try {
              await update(dbRef(FIREBASE_DB, `events/${eventId}`), { status: newStatus, updatedAt: serverTimestamp() });
              Alert.alert('Sucesso!', `Evento marcado como ${newStatus === 'concluded' ? 'concluído' : 'cancelado'}.`);
              if (onEventSaved) onEventSaved();
              onClose();
            } catch (error) {
              Alert.alert('Erro', `Não foi possível ${actionText} o evento.`);
            } finally {
              setIsLoadingForm(false);
            }
          }
        }
      ]
    );
  };

  const eventTypeOptions = [ { label: 'Presencial', value: 'presencial' }, { label: 'Online', value: 'online' } ];

  return (
    <Modal
      isVisible={isVisible}
      onSwipeComplete={isLoadingForm ? null : onClose}
      swipeDirection={isLoadingForm ? [] : ['down']}
      onBackdropPress={isLoadingForm ? null : onClose}
      onModalHide={resetFormFields}
      style={styles.modal}
      avoidKeyboard
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{isEditing ? 'Editar Evento' : 'Novo Evento'}</Text>
          <TouchableOpacity onPress={isLoadingForm ? null : onClose} disabled={isLoadingForm}>
            <Ionicons name="close-outline" size={28} color={isLoadingForm ? "#A0AEC0" : "#333"} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.formContainer}>
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Título do Evento *{reasonDisabled}</Text>
              <TextInput style={[styles.input, formDisabled && styles.disabledInput]} value={title} onChangeText={setTitle} editable={!formDisabled} placeholder="Ex: Reunião Semanal" placeholderTextColor="#A0AEC0" />
            </View>
             <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Descrição</Text>
              <TextInput style={[styles.input, styles.textArea, formDisabled && styles.disabledInput]} value={description} onChangeText={setDescription} multiline numberOfLines={3} editable={!formDisabled} placeholder="Detalhes, pauta da reunião..." placeholderTextColor="#A0AEC0"/>
            </View>
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Data e Hora *</Text>
              <View style={styles.dateTimeContainer}>
                <TouchableOpacity onPress={showDatePicker} style={[styles.dateTimeInputWrapper, formDisabled && styles.disabledInput]} disabled={formDisabled}>
                  <Ionicons name="calendar-outline" size={20} color={formDisabled ? "#A0AEC0" : "#4A5568"} style={styles.dateTimeIcon} />
                  <Text style={[styles.dateTimeInputText, formDisabled && styles.disabledText]}>{date.toLocaleDateString('pt-BR')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={showTimePicker} style={[styles.dateTimeInputWrapper, formDisabled && styles.disabledInput]} disabled={formDisabled}>
                  <Ionicons name="time-outline" size={20} color={formDisabled ? "#A0AEC0" : "#4A5568"} style={styles.dateTimeIcon} />
                  <Text style={[styles.dateTimeInputText, formDisabled && styles.disabledText]}>{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <CustomPicker label="Formato do Encontro *" options={eventTypeOptions} selectedValue={eventType} onValueChange={setEventType} disabled={formDisabled} />
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>{eventType === 'online' ? 'Link/Plataforma *' : 'Local/Sala *'}</Text>
              <TextInput style={[styles.input, formDisabled && styles.disabledInput]} value={location} onChangeText={setLocation} editable={!formDisabled} placeholder={eventType === 'online' ? 'Ex: Google Meet, Zoom...' : 'Ex: Sala de Reuniões 03'} placeholderTextColor="#A0AEC0"/>
            </View>
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Convidados</Text>
              <View style={styles.guestSearchContainer}>
                <TextInput style={[styles.input, {flex: 1, marginRight: 8}, formDisabled && styles.disabledInput]} value={guestsSearch} onChangeText={setGuestsSearch} editable={!formDisabled} placeholder="Buscar por nome..." placeholderTextColor="#A0AEC0"/>
                <TouchableOpacity onPress={handleSearchUsers} style={[styles.searchButton, (isSearchingUsers || formDisabled) && styles.disabledInput]} disabled={isSearchingUsers || formDisabled}>
                    {isSearchingUsers ? <ActivityIndicator color="#fff" size="small"/> : <Ionicons name="search-outline" size={24} color={formDisabled ? "#A0AEC0" : "#fff"} />}
                </TouchableOpacity>
              </View>
              {foundUsers.length > 0 && (
                <View style={styles.foundUsersList}>
                    <ScrollView nestedScrollEnabled style={{maxHeight: 120}}>
                        {foundUsers.map(item => (
                            <TouchableOpacity key={item.id} style={styles.userItem} onPress={() => toggleGuestSelection(item)} disabled={formDisabled}>
                                <Text style={styles.userItemText}>{item.name} ({item.email})</Text>
                                <Ionicons name={"square-outline"} size={22} color="#1D854C" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
              )}
               {Object.keys(selectedGuests).length > 0 && (
                <View style={styles.selectedGuestsContainer}>
                    <Text style={styles.selectedGuestsTitle}>Participantes:</Text>
                    <View style={styles.chipsWrapper}>
                        {Object.entries(selectedGuests).map(([uid, guestData]) => (
                            <View key={uid} style={styles.selectedGuestChip}>
                                <Text style={styles.selectedGuestName}>{guestData.name}</Text>
                                {!(isEditing && uid === existingEvent?.createdBy) && !( !isEditing && uid === userData?.uid ) && (
                                    <TouchableOpacity onPress={() => toggleGuestSelection({ id: uid, ...guestData })} style={{marginLeft: 5}} disabled={formDisabled}>
                                        <Ionicons name="close-circle-outline" size={18} color="#D32F2F" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                </View>
              )}
            </View>
            <TouchableOpacity style={[styles.confirmButton, formDisabled && styles.confirmButtonDisabled]} onPress={handleSaveEvent} disabled={formDisabled}>
              {isLoadingForm ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>{isEditing ? 'Salvar Alterações' : 'Criar Evento'}</Text> }
            </TouchableOpacity>
            {isCreator && status === 'active' && (
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity style={[styles.actionButton, styles.concludeButton]} onPress={() => handleUpdateStatus('concluded')} disabled={isLoadingForm}>
                  <Ionicons name="checkmark-done-circle-outline" size={20} color="#15803d" />
                  <Text style={[styles.actionButtonText, {color: '#15803d'}]}>Marcar como Concluído</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => handleUpdateStatus('cancelled')} disabled={isLoadingForm}>
                  <Ionicons name="close-circle-outline" size={20} color="#b91c1c" />
                  <Text style={[styles.actionButtonText, {color: '#b91c1c'}]}>Cancelar Evento</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
        <DateTimePickerModal isVisible={isDatePickerVisible} mode="date" date={date} onConfirm={handleDateConfirm} onCancel={hideDatePicker} />
        <DateTimePickerModal isVisible={isTimePickerVisible} mode="time" date={time} onConfirm={handleTimeConfirm} onCancel={hideTimePicker} is24Hour />
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
  input: { backgroundColor: '#F7F8FC', borderRadius: 10, height: 52, paddingHorizontal: 15, fontSize: 16, color: '#2D3748', borderWidth: 1, borderColor: '#E2E8F0', },
  disabledInput: { backgroundColor: '#E5E7EB' },
  disabledText: { color: '#9CA3AF' },
  textArea: { minHeight: 80, paddingTop: 12, textAlignVertical: 'top', },
  dateTimeContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  dateTimeInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FC', borderRadius: 10, height: 52, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0', },
  dateInput: { flex: 0.58, marginRight: 8 }, 
  timeInput: { flex: 0.38, marginLeft: 8 }, 
  dateTimeIcon: { marginRight: 8 },
  dateTimeInputText: { fontSize: 16, color: '#2D3748' },
  confirmButton: { backgroundColor: '#1D854C', borderRadius: 10, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 2, },
  confirmButtonDisabled: { backgroundColor: '#A5D6A7' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  pickerButton: { backgroundColor: '#F7F8FC', borderRadius: 10, height: 52, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', },
  pickerButtonText: { fontSize: 16, color: '#2D3748' },
  pickerOptionsContainer: { backgroundColor: '#FFFFFF', borderRadius: 8, marginTop: 4, borderColor: '#E2E8F0', borderWidth: 1, elevation: 5, zIndex: 1000, position: 'absolute', width: '100%', top: 80, },
  pickerOption: { paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  guestSearchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  searchButton: { backgroundColor: '#1D854C', paddingHorizontal: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center', height: 52, },
  foundUsersList: { borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 8, backgroundColor: '#fff', marginTop: 8, },
  userItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', },
  userItemText: { fontSize: 15, color: '#374151' },
  selectedGuestsContainer: { marginTop: 15 },
  selectedGuestsTitle: { fontSize: 14, fontWeight: '600', color: '#10502F', marginBottom: 10 },
  chipsWrapper: { flexDirection: 'row', flexWrap: 'wrap' },
  selectedGuestChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2FE', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 8, },
  selectedGuestName: { color: '#0C4A6E', fontWeight: '500', fontSize: 14 },
  actionButtonsContainer: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 20, },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, height: 50, borderWidth: 1.5, marginBottom: 12, },
  actionButtonText: { marginLeft: 8, fontSize: 16, fontWeight: '600', },
  concludeButton: { borderColor: '#16a34a', backgroundColor: '#f0fdf4', },
  cancelButton: { borderColor: '#dc2626', backgroundColor: '#fef2f2', },
});