import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, FlatList, TextInput, ActivityIndicator, Alert, ScrollView, Platform
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NewNoteModal, PREDEFINED_CATEGORIES } from './NewNoteModal';

export const NotasScreen = ({ navigation }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [allNotes, setAllNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const categoriesForFilter = useMemo(() => {
    const geralCategoryColor = PREDEFINED_CATEGORIES.find(c => c.id === 'geral')?.color || '#78909C';
    return [{ id: 'all', name: 'Todas', color: geralCategoryColor }, ...PREDEFINED_CATEGORIES];
  }, []);

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedNotes = await AsyncStorage.getItem('@notes');
      const notes = storedNotes ? JSON.parse(storedNotes) : [];
      setAllNotes(notes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar suas anotações.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const filteredNotes = useMemo(() => {
    return allNotes.filter(note => {
        const matchesCategory = activeCategory === 'all' || note.category === activeCategory;
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = searchTerm === '' ||
                              (note.title && note.title.toLowerCase().includes(searchLower)) ||
                              (note.content && note.content.toLowerCase().includes(searchLower));
        return matchesCategory && matchesSearch;
    });
  }, [allNotes, activeCategory, searchTerm]);

  const handleOpenNoteModal = (note = null) => {
    setSelectedNote(note);
    setModalVisible(true);
  };

  const getCategoryDetails = (categoryId) => {
    return PREDEFINED_CATEGORIES.find(cat => cat.id === categoryId) || PREDEFINED_CATEGORIES.find(cat => cat.id === 'geral');
  };

  const handleDeleteNote = async (noteId) => {
    if (!noteId) return;
    Alert.alert("Confirmar Exclusão", "Tem certeza que deseja excluir esta anotação?",
        [ { text: "Cancelar", style: "cancel" },
          { text: "Excluir", style: "destructive", onPress: async () => {
                setIsDeleting(true);
                try {
                    const updatedNotes = allNotes.filter(note => note.id !== noteId);
                    await AsyncStorage.setItem('@notes', JSON.stringify(updatedNotes));
                    setAllNotes(updatedNotes);
                    Alert.alert("Sucesso", "Anotação excluída.");
                } catch (error) { Alert.alert("Erro", "Não foi possível excluir a anotação.");
                } finally { setIsDeleting(false); }
            }}
        ], { cancelable: true }
    );
  };

  const renderNotaCard = ({ item }) => {
    if (!item || !item.id) return null;
    const categoryDetails = getCategoryDetails(item.category);
    const displayColor = item.color || categoryDetails.color;
    return (
        <TouchableOpacity style={noteStyles.notaCard} activeOpacity={0.8} onPress={() => handleOpenNoteModal(item)}>
            <View style={[noteStyles.colorIndicator, { backgroundColor: displayColor }]} />
            <View style={noteStyles.notaInfo}>
                {item.title ? <Text style={noteStyles.notaTitle} numberOfLines={1}>{item.title}</Text> : null}
                <Text style={noteStyles.notaContent} numberOfLines={item.title ? 3 : 5}>{item.content || "Sem conteúdo..."}</Text>
                <View style={noteStyles.cardFooter}>
                    <View style={[noteStyles.categoryChip, {backgroundColor: `${categoryDetails.color}30`}]}>
                        <Text style={[noteStyles.notaCategoryText, {color: categoryDetails.color}]}>{categoryDetails.name}</Text>
                    </View>
                    <View style={noteStyles.footerActions}>
                        <Text style={noteStyles.notaDate}>{new Date(item.updatedAt).toLocaleDateString('pt-BR', {day: '2-digit', month:'short'})}</Text>
                        <TouchableOpacity style={noteStyles.deleteButton} onPress={() => handleDeleteNote(item.id)}>
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={noteStyles.container}>
      <StatusBar backgroundColor="#1D854C" barStyle="light-content" />
      <View style={noteStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={noteStyles.headerButton}><Ionicons name="arrow-back-outline" size={26} color="#FFFFFF"/></TouchableOpacity>
        <Text style={noteStyles.headerTitle}>Minhas Anotações</Text>
        <View style={{width: 38}} />
      </View>
      <View style={noteStyles.searchContainer}>
        <Ionicons name="search-outline" size={22} color="#A0AEC0" style={noteStyles.searchIcon} />
        <TextInput style={noteStyles.searchInput} placeholder="Buscar por título ou conteúdo..." value={searchTerm} onChangeText={setSearchTerm}/>
        {searchTerm ? (<TouchableOpacity onPress={() => setSearchTerm('')} style={noteStyles.clearSearchButton}><Ionicons name="close-circle" size={20} color="#CBD5E0" /></TouchableOpacity>) : null}
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={noteStyles.categoriasContainer}>
          {categoriesForFilter.map(cat => (
            <TouchableOpacity key={cat.id} style={[noteStyles.categoriaButton, activeCategory === cat.id && noteStyles.categoriaButtonActive, activeCategory === cat.id && { backgroundColor: `${cat.color}33` } ]} onPress={() => setActiveCategory(cat.id)}>
              <Text style={[noteStyles.categoriaText, activeCategory === cat.id && noteStyles.categoriaTextActive, activeCategory === cat.id && { color: cat.color } ]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {isLoading ? (
         <View style={noteStyles.fullScreenLoader}><ActivityIndicator size="large" color="#1D854C" /><Text style={noteStyles.loadingText}>Carregando...</Text></View>
      ) : (
        <FlatList
          data={filteredNotes} renderItem={renderNotaCard} keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={noteStyles.notasList} numColumns={2} columnWrapperStyle={noteStyles.row}
          ListEmptyComponent={() => (
            <View style={noteStyles.emptyStateContainer}>
                <Ionicons name="reader-outline" size={60} color="#CBD5E0" />
                <Text style={noteStyles.emptyStateText}>Nenhuma anotação encontrada.</Text>
                {searchTerm === '' && activeCategory === 'all' && <Text style={noteStyles.emptyStateSubText}>Crie sua primeira anotação no botão '+'!</Text>}
            </View>
          )}
        />
      )}
      <TouchableOpacity style={[noteStyles.addButton, isDeleting && noteStyles.buttonDisabled]} onPress={() => !isDeleting && handleOpenNoteModal()} disabled={isDeleting}>
        {isDeleting ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name="add" size={32} color="#FFFFFF" />}
      </TouchableOpacity>
      <NewNoteModal isVisible={isModalVisible} onClose={() => { setModalVisible(false); setSelectedNote(null); }} onNoteSaved={loadNotes} existingNote={selectedNote}/>
    </SafeAreaView>
  );
};

const noteStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { height: 60, backgroundColor: '#1D854C', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, elevation: 4, },
  headerButton: { padding: 10 },
  headerTitle: { fontSize: 20, color: '#FFFFFF', fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 25, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 15, height: 50, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#2D3748' },
  clearSearchButton: { padding: 5 },
  categoriasContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  categoriaButton: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, marginRight: 10, backgroundColor: '#E9EDF5', borderWidth: 1, borderColor: 'transparent', },
  categoriaButtonActive: { borderColor: '#D1D5DB', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 1, },
  categoriaText: { fontSize: 14, color: '#4A5568', fontWeight: '500' },
  categoriaTextActive: { fontWeight: 'bold' }, 
  fullScreenLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#1D854C' },
  notasList: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 90 },
  row: { justifyContent: 'space-between', paddingHorizontal: 4 }, 
  notaCard: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 16, elevation: 2, shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, width: '48.5%', overflow: 'hidden', },
  colorIndicator: { height: 8, width: '100%' },
  notaInfo: { padding: 14, }, 
  notaTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 6, lineHeight: 22 }, 
  notaContent: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  footerActions: { flexDirection: 'row', alignItems: 'center' },
  deleteButton: { marginLeft: 8, padding: 4, },
  categoryChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, },
  notaCategoryText: { fontSize: 11, fontWeight: '500', textTransform: 'capitalize' }, 
  notaDate: { fontSize: 11, color: '#9CA3AF' },
  emptyStateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, marginTop: 40, width: '100%' },
  emptyStateText: { marginTop: 16, fontSize: 17, fontWeight: '500', color: '#6B7280', textAlign: 'center' },
  emptyStateSubText: { marginTop: 8, fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  addButton: { position: 'absolute', right: 20, bottom: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: '#1D854C', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#052e16', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, },
  buttonDisabled: { backgroundColor: '#A5D6A7', }
});