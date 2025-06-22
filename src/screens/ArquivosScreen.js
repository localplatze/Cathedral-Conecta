import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform,
  StatusBar, FlatList, ActivityIndicator, Alert, Linking, ScrollView
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { NewFileModal } from './NewFileModal';
import { useAuth } from '../AuthContext';
import { FIREBASE_DB } from '../firebaseConnection';
import { ref, onValue, query, orderByChild } from 'firebase/database';

const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getFileIcon = (fileType) => {
    if (!fileType) return 'document-text-outline';
    fileType = fileType.toLowerCase();
    if (fileType.startsWith('image/')) return 'image-outline';
    if (fileType.startsWith('video/')) return 'videocam-outline';
    if (fileType.startsWith('audio/')) return 'musical-notes-outline';
    if (fileType === 'application/pdf') return 'document-outline';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'easel-outline';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'stats-chart-outline';
    if (fileType.includes('word') || fileType.includes('document')) return 'document-text-outline';
    if (fileType.includes('zip') || fileType.includes('archive')) return 'archive-outline';
    return 'document-attach-outline';
};

export const ArquivosScreen = ({ navigation }) => {
  const { userData } = useAuth();
  const [viewType, setViewType] = useState('meusArquivos');
  const [myFiles, setMyFiles] = useState([]);
  const [sharedWithMeFiles, setSharedWithMeFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!userData || !userData.uid) {
      setIsLoading(false); setMyFiles([]); setSharedWithMeFiles([]);
      return;
    }
    setIsLoading(true);
    const filesRef = query(ref(FIREBASE_DB, 'sharedFiles'), orderByChild('uploadedAt'));
    const unsubscribe = onValue(filesRef, (snapshot) => {
      const loadedMyFiles = [];
      const loadedSharedFiles = [];
      if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
          const file = { id: childSnapshot.key, ...childSnapshot.val() };
          if (file.uploadedByUid === userData.uid) {
            loadedMyFiles.push(file);
          } 
          else if (file.permissions && file.permissions[userData.uid] && file.uploadedByUid !== userData.uid) {
            loadedSharedFiles.push(file);
          }
        });
      }
      setMyFiles(loadedMyFiles.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0)));
      setSharedWithMeFiles(loadedSharedFiles.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0)));
      setIsLoading(false);
    }, (error) => {
      console.error("Erro ao carregar arquivos:", error);
      Alert.alert("Erro", "Não foi possível carregar os arquivos.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userData]);

  const handleOpenFile = async (fileUrl, fileName) => {
    if (!fileUrl) { Alert.alert("Erro", "URL do arquivo não disponível."); return; }
    try {
        const supported = await Linking.canOpenURL(fileUrl);
        if (supported) { await Linking.openURL(fileUrl); } 
        else { Alert.alert("Ação não Suportada", `Não é possível abrir "${fileName}".`); }
    } catch (error) { Alert.alert("Erro", "Ocorreu um erro ao tentar abrir o arquivo."); }
  };

  const handleOpenModal = (file = null) => {
    setSelectedFile(file);
    setModalVisible(true);
  };

  const renderArquivoCard = ({ item }) => {
    const canEditOrDelete = item.uploadedByUid === userData?.uid;
    const fileIconName = getFileIcon(item.fileType);

    return (
        <TouchableOpacity style={fileStyles.arquivoCard} activeOpacity={0.8} onPress={() => handleOpenFile(item.fileUrl, item.fileName)}>
            <View style={fileStyles.arquivoIconContainer}>
                <Ionicons name={fileIconName} size={28} color="#1D854C" />
            </View>
            <View style={fileStyles.arquivoInfo}>
                <Text style={fileStyles.arquivoTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={fileStyles.arquivoDetails} numberOfLines={1}>{item.fileName} ({formatBytes(item.fileSize || 0)})</Text>
                <Text style={fileStyles.arquivoDate}>Por: {item.uploadedByName || 'Desconhecido'} em {new Date(item.uploadedAt || Date.now()).toLocaleDateString('pt-BR')}</Text>
                {item.tags && item.tags.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={fileStyles.tagsScrollContainer}>
                        <View style={fileStyles.tagsContainer}>
                            {item.tags.map(tag => (<View key={tag} style={fileStyles.tagChipMini}><Text style={fileStyles.tagTextMini}>{tag}</Text></View>))}
                        </View>
                    </ScrollView>
                )}
            </View>
            {canEditOrDelete && (
                <View style={fileStyles.actionIconsContainer}>
                    <TouchableOpacity onPress={() => handleOpenModal(item)} style={fileStyles.actionIconTouch}>
                        <Ionicons name="ellipsis-vertical" size={22} color="#6B7280" />
                    </TouchableOpacity>
                </View>
            )}
        </TouchableOpacity>
    );
  };
  
  const filesToDisplay = viewType === 'meusArquivos' ? myFiles : sharedWithMeFiles;

  return (
    <SafeAreaView style={fileStyles.container}>
      <StatusBar backgroundColor="#1D854C" barStyle="light-content" />
      <View style={fileStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={fileStyles.headerButton}><Ionicons name="arrow-back-outline" size={26} color="#FFFFFF"/></TouchableOpacity>
        <Text style={fileStyles.headerTitle}>Documentos</Text>
        <View style={{width: 38}} /> 
      </View>
      <View style={fileStyles.viewTypeContainer}>
        <TouchableOpacity style={[fileStyles.viewTypeButton, viewType === 'meusArquivos' && fileStyles.viewTypeButtonActive]} onPress={() => setViewType('meusArquivos')}>
          <Ionicons name="folder-outline" size={18} color={viewType === 'meusArquivos' ? '#065F46' : '#374151'} style={{marginRight: 6}}/>
          <Text style={[fileStyles.viewTypeText, viewType === 'meusArquivos' && fileStyles.viewTypeTextActive]}>Meus Arquivos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[fileStyles.viewTypeButton, viewType === 'compartilhadosComigo' && fileStyles.viewTypeButtonActive]} onPress={() => setViewType('compartilhadosComigo')}>
          <Ionicons name="people-outline" size={18} color={viewType === 'compartilhadosComigo' ? '#065F46' : '#374151'} style={{marginRight: 6}}/>
          <Text style={[fileStyles.viewTypeText, viewType === 'compartilhadosComigo' && fileStyles.viewTypeTextActive]}>Compartilhados</Text>
        </TouchableOpacity>
      </View>

      {isLoading && !filesToDisplay.length ? (
        <View style={fileStyles.fullScreenLoader}><ActivityIndicator size="large" color="#1D854C" /><Text style={fileStyles.loadingText}>Carregando...</Text></View>
      ) : (
        <FlatList
          data={filesToDisplay}
          renderItem={renderArquivoCard}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={fileStyles.arquivosList}
          ListEmptyComponent={() => (
            <View style={fileStyles.emptyStateContainer}>
                <Ionicons name="file-tray-outline" size={60} color="#CBD5E0" />
                <Text style={fileStyles.emptyStateText}>{viewType === 'meusArquivos' ? 'Você ainda não tem arquivos.' : 'Nenhum arquivo compartilhado.'}</Text>
                {viewType === 'meusArquivos' && <Text style={fileStyles.emptyStateSubText}>Use o botão '+' para adicionar.</Text>}
            </View>
          )}
        />
      )}
      <TouchableOpacity style={[fileStyles.addButton, isDeleting && fileStyles.buttonDisabled]} onPress={() => !isDeleting && handleOpenModal()} disabled={isDeleting}>
        {isDeleting ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name="add" size={32} color="#FFFFFF" />}
      </TouchableOpacity>
      <NewFileModal isVisible={isModalVisible} onClose={() => { setModalVisible(false); setSelectedFile(null); }} onFileSaved={() => {}} existingFile={selectedFile}/>
    </SafeAreaView>
  );
};

const fileStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { height: 60, backgroundColor: '#1D854C', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, elevation: 4, },
  headerButton: { padding: 10 },
  headerTitle: { fontSize: 20, color: '#FFFFFF', fontWeight: '600' },
  viewTypeContainer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', },
  viewTypeButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, marginHorizontal: 8, backgroundColor: '#F3F4F6', },
  viewTypeButtonActive: { backgroundColor: '#D1FAE5' }, 
  viewTypeText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  viewTypeTextActive: { color: '#065F46', fontWeight: '600' }, 
  fullScreenLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', },
  loadingText: { marginTop: 10, fontSize: 16, color: '#1D854C', },
  arquivosList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 90 },
  arquivoCard: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, },
  arquivoIconContainer: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 12, },
  arquivoInfo: { flex: 1, marginRight: 8 }, 
  arquivoTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 3 }, 
  arquivoDetails: { fontSize: 12, color: '#6B7280', marginBottom: 2 }, 
  arquivoDate: { fontSize: 11, color: '#9CA3AF', marginBottom: 5 }, 
  tagsScrollContainer: { maxHeight: 28, marginTop: 2, },
  tagsContainer: { flexDirection: 'row' }, 
  tagChipMini: { backgroundColor: '#E0E7FF', borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8, marginRight: 5, },
  tagTextMini: { color: '#4338CA', fontSize: 10, fontWeight: '500' }, 
  actionIconsContainer: { paddingLeft: 8, },
  actionIconTouch: { padding: 8, },
  emptyStateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, marginTop: 40 },
  emptyStateText: { marginTop: 16, fontSize: 17, fontWeight: '500', color: '#6B7280', textAlign: 'center' },
  emptyStateSubText: { marginTop: 8, fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  addButton: { position: 'absolute', right: 20, bottom: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: '#1D854C', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#052e16', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, },
  buttonDisabled: { backgroundColor: '#A5D6A7', }
});