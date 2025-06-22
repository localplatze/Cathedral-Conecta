import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Alert, ActivityIndicator
} from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CustomPicker = ({ label, options, selectedValue, onValueChange, disabled }) => {
  const [showOptions, setShowOptions] = useState(false);
  return (
    <View style={styles.inputField}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity onPress={() => !disabled && setShowOptions(!showOptions)} style={[styles.pickerButton, disabled && styles.disabledInput]}>
        <Text style={styles.pickerButtonText}>{options.find(opt => opt.value === selectedValue)?.label || 'Selecione...'}</Text>
        <Ionicons name={showOptions ? "chevron-up-outline" : "chevron-down-outline"} size={22} color="#555" />
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

export const PREDEFINED_CATEGORIES = [
    { id: 'geral', name: 'Geral', color: '#78909C' },
    { id: 'aula', name: 'Aula', color: '#42A5F5' },
    { id: 'projeto', name: 'Projeto', color: '#66BB6A' },
    { id: 'reuniao', name: 'Reunião', color: '#FFA726' },
    { id: 'pessoal', name: 'Pessoal', color: '#AB47BC' },
    { id: 'ideia', name: 'Ideia', color: '#26A69A' },
];

export const NOTE_COLORS = ['#FFCDD2', '#C5CAE9', '#B2DFDB', '#FFF9C4', '#D1C4E9', '#FFCCBC', '#CFD8DC'];

export const NewNoteModal = ({ isVisible, onClose, onNoteSaved, existingNote }) => {
  const [noteId, setNoteId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(PREDEFINED_CATEGORIES[0].id);
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!existingNote;

  useEffect(() => {
    if (isVisible) {
      if (isEditing && existingNote) {
        setNoteId(existingNote.id);
        setTitle(existingNote.title || '');
        setContent(existingNote.content || '');
        setCategory(existingNote.category || PREDEFINED_CATEGORIES[0].id);
        setColor(existingNote.color || NOTE_COLORS[0]);
      } else {
        setNoteId(null); setTitle(''); setContent('');
        setCategory(PREDEFINED_CATEGORIES[0].id); setColor(NOTE_COLORS[0]);
      }
    }
  }, [existingNote, isVisible, isEditing]);

  const categoryOptions = PREDEFINED_CATEGORIES.map(cat => ({ label: cat.name, value: cat.id }));

  const handleSaveNote = async () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert('Nota Vazia', 'Adicione um título ou conteúdo para a nota.');
      return;
    }
    setIsLoading(true);
    try {
      const storedNotes = await AsyncStorage.getItem('@notes');
      const notes = storedNotes ? JSON.parse(storedNotes) : [];
      const now = Date.now();
      if (isEditing && noteId) {
        const noteIndex = notes.findIndex(note => note.id === noteId);
        if (noteIndex > -1) {
          notes[noteIndex] = {
            ...notes[noteIndex],
            title: title.trim(), content: content.trim(),
            category, color, updatedAt: now,
          };
        }
      } else {
        const newNote = {
          id: now.toString(), title: title.trim(), content: content.trim(),
          category, color, createdAt: now, updatedAt: now,
        };
        notes.push(newNote);
      }
      await AsyncStorage.setItem('@notes', JSON.stringify(notes));
      Alert.alert('Sucesso', `Nota ${isEditing ? 'atualizada' : 'criada'}!`);
      onNoteSaved();
      onClose();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a nota.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isVisible={isVisible} onSwipeComplete={onClose} swipeDirection={['down']} onBackdropPress={onClose} style={styles.modal} avoidKeyboard>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{isEditing ? 'Editar Nota' : 'Nova Nota'}</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close-outline" size={28} color="#333" /></TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.formContainer}>
            <View style={styles.inputField}>
              <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} placeholder="Título da nota..." placeholderTextColor="#A0AEC0"/>
            </View>
            <View style={styles.inputField}>
              <TextInput style={styles.contentInput} value={content} onChangeText={setContent} placeholder="Comece a digitar aqui..." placeholderTextColor="#A0AEC0" multiline textAlignVertical="top"/>
            </View>
            <View style={styles.rowFields}>
                <View style={[styles.pickerContainerStyle, {flex: 1, marginRight: 10, zIndex: 20}]}>
                    <CustomPicker label="Categoria" options={categoryOptions} selectedValue={category} onValueChange={setCategory}/>
                </View>
                <View style={{flex: 0.8, marginLeft: 10}}>
                    <Text style={styles.inputLabel}>Cor</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorSelectorContainer}>
                        {NOTE_COLORS.map(c => (
                        <TouchableOpacity key={c} style={[styles.colorOption, { backgroundColor: c }, c === color && styles.colorOptionSelected,]} onPress={() => setColor(c)}/>
                        ))}
                    </ScrollView>
                </View>
            </View>
            <TouchableOpacity style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]} onPress={handleSaveNote} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>{isEditing ? 'Salvar Alterações' : 'Criar Nota'}</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  modalContent: { backgroundColor: '#FFFFFF', paddingTop: 15, borderTopRightRadius: 25, borderTopLeftRadius: 25, maxHeight: '90%', paddingBottom: Platform.OS === 'ios' ? 30 : 10, },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 15, paddingHorizontal: 20, marginBottom: 5, },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A202C' },
  formContainer: { paddingHorizontal: 20, paddingBottom: 150 },
  inputField: { marginBottom: 20 },
  inputLabel: { fontSize: 14, color: '#4A5568', marginBottom: 8, fontWeight: '500' },
  titleInput: { fontSize: 20, fontWeight: '600', color: '#2D3748', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', marginBottom: 10, },
  contentInput: { fontSize: 16, color: '#4A5568', minHeight: 150, textAlignVertical: 'top', paddingTop: 0, lineHeight: 24, },
  rowFields: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 25 },
  colorSelectorContainer: { paddingVertical: 5, alignItems: 'center' },
  colorOption: { width: 32, height: 32, borderRadius: 16, marginRight: 10, borderWidth: 2, borderColor: 'transparent', },
  colorOptionSelected: { borderColor: '#4A5568', transform: [{ scale: 1.1 }] },
  confirmButton: { backgroundColor: '#1D854C', borderRadius: 10, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 20, elevation: 2, },
  confirmButtonDisabled: { backgroundColor: '#A5D6A7' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  pickerButton: { backgroundColor: '#F7F8FC', borderRadius: 10, height: 50, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', },
  pickerButtonText: { fontSize: 15, color: '#2D3748' },
  disabledInput: { backgroundColor: '#E5E7EB' },
  pickerOptionsContainer: { backgroundColor: '#FFFFFF', borderRadius: 8, marginTop: 4, borderColor: '#E2E8F0', borderWidth: 1, elevation: 5, zIndex: 1000, position: 'absolute', width: '100%', top: 55, },
  pickerOption: { paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
});