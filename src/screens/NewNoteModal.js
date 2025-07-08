import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Alert, ActivityIndicator
} from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import { FIREBASE_DB } from '../firebaseConnection'; // Importe o DB
import { ref, push, update, serverTimestamp, get, query, orderByChild } from 'firebase/database'; // Importe funções do DB
import { useAuth } from '../AuthContext'; // Para obter dados do avaliador

// Componente para buscar e selecionar alunos
export const StudentSelector = ({ onStudentSelect, initialValue = null, disabled }) => {
    const [search, setSearch] = useState('');
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(initialValue);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if(initialValue) setSelectedStudent(initialValue);
    }, [initialValue]);

    const handleSearch = async () => {
        if (search.trim().length < 3) return;
        setIsLoading(true);
        try {
            const usersRef = query(ref(FIREBASE_DB, 'users'), orderByChild('name'));
            const snapshot = await get(usersRef);
            const foundStudents = [];
            snapshot.forEach(child => {
                const user = { id: child.key, ...child.val() };
                // Supondo que alunos tenham role 'student' ou similar
                if (user.name.toLowerCase().includes(search.toLowerCase()) && user.role === 'aluno') {
                    foundStudents.push(user);
                }
            });
            setStudents(foundStudents);
        } catch (error) {
            Alert.alert("Erro", "Não foi possível buscar os alunos.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View>
            <View style={styles.searchContainer}>
                <TextInput 
                    style={[styles.input, { flex: 1 }]} 
                    placeholder="Buscar aluno por nome..." 
                    value={selectedStudent ? selectedStudent.name : search}
                    onChangeText={text => {
                        setSelectedStudent(null);
                        setSearch(text);
                    }}
                    editable={!selectedStudent && !disabled}
                />
                <TouchableOpacity onPress={handleSearch} disabled={isLoading || disabled} style={styles.searchButton}>
                    {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="search" size={20} color="#fff" />}
                </TouchableOpacity>
            </View>
            {!selectedStudent && students.map(student => (
                <TouchableOpacity key={student.id} style={styles.studentItem} onPress={() => {
                    setSelectedStudent(student);
                    onStudentSelect(student);
                    setStudents([]);
                }}>
                    <Text>{student.name}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};


export const NewNoteModal = ({ isVisible, onClose, onNoteSaved, existingNote }) => {
  const { userData } = useAuth();
  const [noteId, setNoteId] = useState(null);
  const [student, setStudent] = useState(null);
  const [content, setContent] = useState('');
  const [grade, setGrade] = useState('');
  const [semester, setSemester] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!existingNote;

  useEffect(() => {
    if (isVisible) {
      if (isEditing && existingNote) {
        setNoteId(existingNote.id);
        setStudent({ id: existingNote.studentId, name: existingNote.studentName });
        setContent(existingNote.content || '');
        setGrade(String(existingNote.grade || ''));
        setSemester(existingNote.semester || '');
      } else {
        // Resetar formulário
        setNoteId(null); setStudent(null); setContent('');
        setGrade(''); setSemester('');
      }
    }
  }, [existingNote, isVisible]);

  const handleSaveNote = async () => {
    if (!student) { Alert.alert('Erro', 'Por favor, selecione um aluno.'); return; }
    if (!content.trim()) { Alert.alert('Erro', 'O campo de observação não pode ser vazio.'); return; }
    if (!semester.trim()) { Alert.alert('Erro', 'Por favor, informe o semestre.'); return; }
    const gradeNumber = parseFloat(grade.replace(',', '.'));
    if (isNaN(gradeNumber) || gradeNumber < 0 || gradeNumber > 10) {
      Alert.alert('Erro', 'Por favor, insira uma nota válida entre 0 e 10.'); return;
    }
    
    setIsLoading(true);
    const assessmentData = {
      studentId: student.id,
      studentName: student.name,
      evaluatorId: userData.uid,
      evaluatorName: userData.name,
      date: new Date().toISOString().split('T')[0], // Data atual
      semester: semester.trim(),
      grade: gradeNumber,
      content: content.trim(),
    };

    try {
      if (isEditing && noteId) {
        // Atualizar registro existente
        const noteRef = ref(FIREBASE_DB, `studentAssessments/${noteId}`);
        await update(noteRef, assessmentData);
        Alert.alert('Sucesso', 'Acompanhamento atualizado!');
      } else {
        // Criar novo registro
        assessmentData.createdAt = serverTimestamp();
        const assessmentsRef = ref(FIREBASE_DB, 'studentAssessments');
        await push(assessmentsRef, assessmentData);
        Alert.alert('Sucesso', 'Acompanhamento registrado!');
      }
      onNoteSaved();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      Alert.alert('Erro', 'Não foi possível salvar o acompanhamento.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isVisible={isVisible} onSwipeComplete={onClose} swipeDirection={['down']} onBackdropPress={onClose} style={styles.modal} avoidKeyboard>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{isEditing ? 'Editar Acompanhamento' : 'Novo Acompanhamento'}</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close-outline" size={28} color="#333" /></TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.formContainer}>
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Aluno *</Text>
              <StudentSelector 
                onStudentSelect={(selected) => setStudent(selected)}
                initialValue={isEditing ? student : null}
                disabled={isEditing} // Não permite alterar o aluno na edição
              />
            </View>
            
            <View style={styles.rowFields}>
                <View style={[styles.inputField, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.inputLabel}>Semestre *</Text>
                    <TextInput style={styles.input} value={semester} onChangeText={setSemester} placeholder="Ex: 2024.1"/>
                </View>
                <View style={[styles.inputField, { flex: 1, marginLeft: 10 }]}>
                    <Text style={styles.inputLabel}>Nota (0-10) *</Text>
                    <TextInput style={styles.input} value={grade} onChangeText={setGrade} placeholder="Ex: 8.5" keyboardType="numeric"/>
                </View>
            </View>

            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Observações *</Text>
              <TextInput style={styles.contentInput} value={content} onChangeText={setContent} placeholder="Descreva o acompanhamento, progresso, dificuldades..." multiline />
            </View>
            
            <TouchableOpacity style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]} onPress={handleSaveNote} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>{isEditing ? 'Salvar Alterações' : 'Registrar'}</Text>}
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
  formContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  inputField: { marginBottom: 20 },
  inputLabel: { fontSize: 14, color: '#4A5568', marginBottom: 8, fontWeight: '500' },
  input: { fontSize: 16, color: '#4A5568', backgroundColor: '#F7F8FC', borderRadius: 10, minHeight: 52, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E2E8F0', },
  contentInput: { fontSize: 16, color: '#4A5568', minHeight: 150, textAlignVertical: 'top', backgroundColor: '#F7F8FC', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#E2E8F0', lineHeight: 24, },
  rowFields: { flexDirection: 'row', justifyContent: 'space-between' },
  confirmButton: { backgroundColor: '#1D854C', borderRadius: 10, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 20, elevation: 2, },
  confirmButtonDisabled: { backgroundColor: '#A5D6A7' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  // Estilos para o StudentSelector
  searchContainer: { flexDirection: 'row', alignItems: 'center' },
  searchButton: { backgroundColor: '#1D854C', padding: 14, borderRadius: 10, marginLeft: 10 },
  studentItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE', backgroundColor: '#FAFAFA' },
});