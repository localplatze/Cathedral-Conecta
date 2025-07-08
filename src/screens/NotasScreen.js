import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, FlatList, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; // Para recarregar ao focar
import { NewNoteModal } from './NewNoteModal';
import { FIREBASE_DB } from '../firebaseConnection';
import { ref, onValue, remove, query, orderByChild } from 'firebase/database';

// Componente para filtro de semestre (pode ser melhorado para um Dropdown)
const SemesterFilter = ({ semesters, activeSemester, onSelect }) => (
    <View style={noteStyles.categoriasContainer}>
        <TouchableOpacity 
            style={[noteStyles.categoriaButton, activeSemester === 'all' && noteStyles.categoriaButtonActive]} 
            onPress={() => onSelect('all')}>
            <Text style={[noteStyles.categoriaText, activeSemester === 'all' && noteStyles.categoriaTextActive]}>Todos</Text>
        </TouchableOpacity>
        {semesters.map(sem => (
            <TouchableOpacity 
                key={sem}
                style={[noteStyles.categoriaButton, activeSemester === sem && noteStyles.categoriaButtonActive]} 
                onPress={() => onSelect(sem)}>
                <Text style={[noteStyles.categoriaText, activeSemester === sem && noteStyles.categoriaTextActive]}>{sem}</Text>
            </TouchableOpacity>
        ))}
    </View>
);

export const NotasScreen = ({ navigation }) => {
  const [allAssessments, setAllAssessments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSemester, setActiveSemester] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);

  const loadAssessments = useCallback(() => {
    setIsLoading(true);
    const assessmentsQuery = query(ref(FIREBASE_DB, 'studentAssessments'), orderByChild('date'));

    const unsubscribe = onValue(assessmentsQuery, (snapshot) => {
      const loadedData = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          loadedData.push({ id: child.key, ...child.val() });
        });
      }
      // Inverte para mostrar os mais recentes primeiro
      setAllAssessments(loadedData.reverse());
      setIsLoading(false);
    }, (error) => {
      console.error(error);
      Alert.alert("Erro", "Não foi possível carregar os acompanhamentos.");
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // useFocusEffect para recarregar os dados sempre que a tela for focada
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = loadAssessments();
      return () => unsubscribe();
    }, [loadAssessments])
  );

  const availableSemesters = useMemo(() => {
    const semesters = new Set(allAssessments.map(item => item.semester));
    return [...semesters].sort().reverse();
  }, [allAssessments]);

  const filteredAssessments = useMemo(() => {
    return allAssessments.filter(item => {
      const matchesSemester = activeSemester === 'all' || item.semester === activeSemester;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
                            (item.studentName && item.studentName.toLowerCase().includes(searchLower));
      return matchesSemester && matchesSearch;
    });
  }, [allAssessments, activeSemester, searchTerm]);

  const handleOpenModal = (note = null) => {
    setSelectedNote(note);
    setModalVisible(true);
  };
  
  const handleDeleteNote = (noteId, studentName) => {
    Alert.alert(
      "Confirmar Exclusão", 
      `Tem certeza que deseja excluir este acompanhamento do aluno ${studentName}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: async () => {
            try {
              await remove(ref(FIREBASE_DB, `studentAssessments/${noteId}`));
              Alert.alert("Sucesso", "Acompanhamento excluído.");
              // A lista será atualizada automaticamente pelo `onValue`
            } catch (error) {
              Alert.alert("Erro", "Não foi possível excluir.");
            }
          }
        }
      ],
      { cancelable: true }
    );
  };

  const renderAssessmentCard = ({ item }) => {
    return (
        <TouchableOpacity style={noteStyles.notaCard} activeOpacity={0.8} onPress={() => handleOpenModal(item)}>
            <View style={noteStyles.cardHeader}>
                <Text style={noteStyles.studentName} numberOfLines={1}>{item.studentName}</Text>
                <View style={noteStyles.gradeChip}>
                    <Text style={noteStyles.gradeText}>{item.grade}</Text>
                </View>
            </View>
            <Text style={noteStyles.notaContent} numberOfLines={4}>{item.content}</Text>
            <View style={noteStyles.cardFooter}>
                <Text style={noteStyles.footerText}>
                    {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month:'short', year: 'numeric'})} • {item.semester}
                </Text>
                <TouchableOpacity style={noteStyles.deleteButton} onPress={() => handleDeleteNote(item.id, item.studentName)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={noteStyles.container}>
      <StatusBar backgroundColor="#1D854C" barStyle="light-content" />
      <View style={noteStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={noteStyles.headerButton}><Ionicons name="arrow-back-outline" size={26} color="#FFFFFF"/></TouchableOpacity>
        <Text style={noteStyles.headerTitle}>Acompanhamentos</Text>
        <View style={{width: 38}} />
      </View>
      <View style={noteStyles.searchContainer}>
        <Ionicons name="search-outline" size={22} color="#A0AEC0" style={noteStyles.searchIcon} />
        <TextInput style={noteStyles.searchInput} placeholder="Buscar por nome do aluno..." value={searchTerm} onChangeText={setSearchTerm}/>
        {searchTerm ? (<TouchableOpacity onPress={() => setSearchTerm('')} style={noteStyles.clearSearchButton}><Ionicons name="close-circle" size={20} color="#CBD5E0" /></TouchableOpacity>) : null}
      </View>
      <SemesterFilter semesters={availableSemesters} activeSemester={activeSemester} onSelect={setActiveSemester} />
      
      {isLoading ? (
         <View style={noteStyles.fullScreenLoader}><ActivityIndicator size="large" color="#1D854C" /></View>
      ) : (
        <FlatList
          data={filteredAssessments} renderItem={renderAssessmentCard} keyExtractor={(item) => item.id}
          contentContainerStyle={noteStyles.notasList}
          ListEmptyComponent={() => (
            <View style={noteStyles.emptyStateContainer}>
                <Ionicons name="reader-outline" size={60} color="#CBD5E0" />
                <Text style={noteStyles.emptyStateText}>Nenhum acompanhamento encontrado.</Text>
                {searchTerm === '' && <Text style={noteStyles.emptyStateSubText}>Crie o primeiro registro no botão '+'!</Text>}
            </View>
          )}
        />
      )}
      <TouchableOpacity style={noteStyles.addButton} onPress={() => handleOpenModal()}>
        <MaterialIcons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
      <NewNoteModal isVisible={isModalVisible} onClose={() => setModalVisible(false)} onNoteSaved={() => {}} existingNote={selectedNote}/>
    </SafeAreaView>
  );
};

// Styles (um pouco adaptados)
const noteStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { height: 60, backgroundColor: '#1D854C', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, },
  headerButton: { padding: 10 },
  headerTitle: { fontSize: 20, color: '#FFFFFF', fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 25, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 15, height: 50, elevation: 2, },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#2D3748' },
  clearSearchButton: { padding: 5 },
  categoriasContainer: { paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  categoriaButton: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, marginRight: 10, marginBottom: 10, backgroundColor: '#E9EDF5', },
  categoriaButtonActive: { backgroundColor: '#D1FAE5' },
  categoriaText: { fontSize: 14, color: '#4A5568', fontWeight: '500' },
  categoriaTextActive: { color: '#065F46', fontWeight: 'bold' },
  fullScreenLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notasList: { padding: 16, paddingBottom: 90 },
  notaCard: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  studentName: { fontSize: 17, fontWeight: 'bold', color: '#1F2937', flex: 1 },
  gradeChip: { backgroundColor: '#1D854C', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 10 },
  gradeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  notaContent: { fontSize: 14, color: '#4B5563', lineHeight: 21, marginBottom: 15 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10, },
  footerText: { fontSize: 12, color: '#6B7280' },
  deleteButton: {},
  emptyStateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, marginTop: 40, },
  emptyStateText: { marginTop: 16, fontSize: 17, fontWeight: '500', color: '#6B7280' },
  emptyStateSubText: { marginTop: 8, fontSize: 14, color: '#9CA3AF' },
  addButton: { position: 'absolute', right: 20, bottom: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: '#1D854C', justifyContent: 'center', alignItems: 'center', elevation: 6, },
});