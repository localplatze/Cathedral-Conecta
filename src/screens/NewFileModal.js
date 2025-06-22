import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Alert, ActivityIndicator
} from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { FIREBASE_DB, FIREBASE_STORAGE } from '../firebaseConnection';
import { ref as dbRef, push, serverTimestamp, query, orderByChild, get, update as fbUpdate, remove as fbRemove } from 'firebase/database';
import { ref as storageRefFn, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '../AuthContext';

const TagInput = ({ tags, onTagsChange, disabled }) => {
  const [currentTag, setCurrentTag] = useState('');
  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim().toLowerCase())) {
      onTagsChange([...tags, currentTag.trim().toLowerCase()]);
      setCurrentTag('');
    }
  };
  const handleRemoveTag = (tagToRemove) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };
  return (
    <View>
      <View style={styles.tagInputContainer}>
        <TextInput
          style={[styles.input, { flex: 1, marginRight: 10, backgroundColor: disabled ? '#E5E7EB' : '#F7F8FC' }]}
          value={currentTag} onChangeText={setCurrentTag} placeholder="Adicionar tag (ex: relatório)"
          placeholderTextColor="#A0AEC0" onSubmitEditing={handleAddTag} returnKeyType="done" editable={!disabled}
        />
        <TouchableOpacity onPress={handleAddTag} style={styles.addTagButton} disabled={disabled}>
          <Ionicons name="add-circle-outline" size={28} color={disabled ? "#A0AEC0" : "#1D854C"} />
        </TouchableOpacity>
      </View>
      <View style={styles.tagsDisplayContainer}>
        {tags.map(tag => (
          <View key={tag} style={styles.tagChip}>
            <Text style={styles.tagText}>{tag}</Text>
            <TouchableOpacity onPress={() => !disabled && handleRemoveTag(tag)} style={{ marginLeft: 5 }} disabled={disabled}>
              <Ionicons name="close-circle" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};

export const NewFileModal = ({ isVisible, onClose, onFileSaved, existingFile }) => {
  const { userData } = useAuth();
  const [fileId, setFileId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [file, setFile] = useState(null);
  const [existingFileUrl, setExistingFileUrl] = useState(null);
  const [existingFileName, setExistingFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [permissionsSearch, setPermissionsSearch] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState({});
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const isEditing = !!existingFile;

  useEffect(() => {
    if (isVisible) {
      if (isEditing && existingFile) {
        setFileId(existingFile.id);
        setTitle(existingFile.title || '');
        setDescription(existingFile.description || '');
        setTags(existingFile.tags || []);
        setFile(null);
        setExistingFileUrl(existingFile.fileUrl);
        setExistingFileName(existingFile.fileName || 'Arquivo existente');
        const currentPermissions = {};
        if(existingFile.permissions){
            Object.entries(existingFile.permissions).forEach(([uid, permData]) => {
                currentPermissions[uid] = permData;
            });
        }
        setSelectedPermissions(currentPermissions);
      } else {
        resetFormFields();
      }
      setFoundUsers([]);
      setPermissionsSearch('');
      setUploadProgress(0);
      setIsUploading(false);
    }
  }, [isVisible, existingFile, isEditing, userData]);

  const resetFormFields = () => {
    setFileId(null); setTitle(''); setDescription(''); setTags([]); setFile(null);
    setExistingFileUrl(null); setExistingFileName(''); setUploadProgress(0);
    setIsUploading(false); setIsLoadingForm(false); setPermissionsSearch(''); setFoundUsers([]);
    if (userData && userData.uid && userData.name) {
      setSelectedPermissions({ [userData.uid]: { name: userData.name, type: 'owner' } });
    } else {
      setSelectedPermissions({});
    }
  };

  const pickDocument = async () => {
    if (isUploading || isLoadingForm) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedAsset = result.assets[0];
        if (pickedAsset.size > 15 * 1024 * 1024) { Alert.alert("Arquivo Muito Grande", "Selecione um arquivo menor que 15MB."); setFile(null); return; }
        setFile(pickedAsset);
        setExistingFileName(''); 
        setExistingFileUrl(null);
      }
    } catch (e) { Alert.alert('Erro', 'Não foi possível selecionar o arquivo.');}
  };

  const handleSearchUsers = async () => {
    if (permissionsSearch.trim().length < 3) { setFoundUsers([]); return; }
    setIsSearchingUsers(true);
    try {
      const usersRef = query(dbRef(FIREBASE_DB, 'users'), orderByChild('name'));
      const snapshot = await get(usersRef);
      let users = [];
      if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
          const uData = childSnapshot.val();
          if (uData.name && uData.name.toLowerCase().includes(permissionsSearch.toLowerCase())) {
            if (childSnapshot.key !== userData.uid && !selectedPermissions[childSnapshot.key]) {
                 users.push({ id: childSnapshot.key, name: uData.name, email: uData.email });
            }
          }
        });
      }
      setFoundUsers(users);
    } catch (error) { Alert.alert("Erro", "Falha ao buscar usuários."); }
    finally { setIsSearchingUsers(false); }
  };

  const toggleUserPermission = (user) => {
    setSelectedPermissions(prev => {
      const newPerms = { ...prev };
      if (newPerms[user.id]) {
        if (prev[user.id]?.type !== 'owner') { delete newPerms[user.id]; }
      } else { newPerms[user.id] = { name: user.name, type: 'view' }; }
      return newPerms;
    });
    setFoundUsers(prev => prev.filter(u => u.id !== user.id));
    setPermissionsSearch('');
  };

  const handleDeleteFile = () => {
    if (!isEditing || !fileId || existingFile.uploadedByUid !== userData?.uid) return;

    Alert.alert("Confirmar Exclusão", `Tem certeza que deseja excluir o arquivo "${title}"? Esta ação não pode ser desfeita.`,
        [{ text: "Cancelar", style: "cancel" }, {
            text: "Excluir", style: "destructive",
            onPress: async () => {
                setIsLoadingForm(true);
                try {
                    if (existingFile.fileStoragePath) {
                        await deleteObject(storageRefFn(FIREBASE_STORAGE, existingFile.fileStoragePath));
                    }
                    await fbRemove(dbRef(FIREBASE_DB, `sharedFiles/${fileId}`));
                    Alert.alert("Sucesso", "Arquivo excluído.");
                    onClose();
                } catch (error) {
                    Alert.alert("Erro", "Não foi possível excluir o arquivo.");
                } finally {
                    setIsLoadingForm(false);
                }
            },
        }],
    );
  };

  const handleSaveFile = async () => {
    if (!title.trim()) { Alert.alert('Erro', 'Título é obrigatório.'); return; }
    if (!isEditing && !file) { Alert.alert('Erro', 'Selecione um arquivo.'); return; }
    if (!userData || !userData.uid) { Alert.alert('Erro', 'Usuário não autenticado.'); return; }
    setIsLoadingForm(true);
    const fileMetadata = {
        title: title.trim(), description: description.trim(),
        tags: tags, permissions: selectedPermissions, updatedAt: serverTimestamp(),
    };
    const processSave = async (finalMetadata) => {
        try {
            if (isEditing && fileId) {
                await fbUpdate(dbRef(FIREBASE_DB, `sharedFiles/${fileId}`), finalMetadata);
                Alert.alert('Sucesso', 'Arquivo atualizado!');
            } else {
                finalMetadata.uploadedByUid = userData.uid;
                finalMetadata.uploadedByName = userData.name || 'Desconhecido';
                finalMetadata.createdAt = serverTimestamp();
                await push(dbRef(FIREBASE_DB, 'sharedFiles'), finalMetadata);
                Alert.alert('Sucesso', 'Arquivo enviado!');
            }
            if(onFileSaved) onFileSaved(); onClose(); 
        } catch (error) { Alert.alert('Erro', `Não foi possível ${isEditing ? 'atualizar' : 'enviar'} o arquivo.`);
        } finally { setIsLoadingForm(false); setIsUploading(false); }
    };

    if (file) {
        setIsUploading(true); setUploadProgress(0);
        try {
            const response = await fetch(file.uri);
            const blob = await response.blob();
            if (isEditing && existingFile?.fileStoragePath) {
                try { await deleteObject(storageRefFn(FIREBASE_STORAGE, existingFile.fileStoragePath)); }
                catch (delError) { console.warn("Falha ao deletar arquivo antigo:", delError); }
            }
            const fileExtension = file.name.split('.').pop();
            const newStoragePath = `sharedFiles/${userData.uid}/${Date.now()}_${title.replace(/\s+/g, '_') || 'arquivo'}.${fileExtension}`;
            const fileStoreRef = storageRefFn(FIREBASE_STORAGE, newStoragePath);
            const uploadTask = uploadBytesResumable(fileStoreRef, blob, { contentType: file.mimeType });
            uploadTask.on('state_changed', 
                (snapshot) => setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
                (error) => { Alert.alert('Erro de Upload', 'Falha no envio.'); setIsUploading(false); setIsLoadingForm(false); },
                async () => {
                    fileMetadata.fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    fileMetadata.fileName = file.name;
                    fileMetadata.fileType = file.mimeType || 'application/octet-stream';
                    fileMetadata.fileSize = file.size;
                    fileMetadata.fileStoragePath = newStoragePath;
                    await processSave(fileMetadata);
                }
            );
        } catch (error) { Alert.alert('Erro', 'Falha ao preparar o envio.'); setIsLoadingForm(false); setIsUploading(false); }
    } else if (isEditing) {
        fileMetadata.fileUrl = existingFile.fileUrl; fileMetadata.fileName = existingFile.fileName;
        fileMetadata.fileType = existingFile.fileType; fileMetadata.fileSize = existingFile.fileSize;
        fileMetadata.fileStoragePath = existingFile.fileStoragePath;
        fileMetadata.uploadedByUid = existingFile.uploadedByUid; fileMetadata.uploadedByName = existingFile.uploadedByName;
        fileMetadata.createdAt = existingFile.createdAt;
        await processSave(fileMetadata);
    } else { setIsLoadingForm(false); }
  };
  
  const currentActionText = isEditing ? 'Salvar Alterações' : 'Adicionar Arquivo';
  const formDisabled = isUploading || isLoadingForm;

  return (
    <Modal isVisible={isVisible} onSwipeComplete={formDisabled ? null : onClose} swipeDirection={formDisabled ? [] : ['down']} onBackdropPress={formDisabled ? null : onClose} onModalHide={resetFormFields} style={styles.modal} avoidKeyboard>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{isEditing ? 'Editar Documento' : 'Novo Documento'}</Text>
          <TouchableOpacity onPress={formDisabled ? null : onClose} disabled={formDisabled}>
            <Ionicons name="close-outline" size={28} color={formDisabled ? "#A0AEC0" : "#333"} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.formContainer}>
            <View style={styles.inputField}><Text style={styles.inputLabel}>Título do Documento *</Text><TextInput style={[styles.input, formDisabled && styles.disabledBg]} value={title} onChangeText={setTitle} placeholder="Ex: Relatório Semestral" editable={!formDisabled}/></View>
            <View style={styles.inputField}><Text style={styles.inputLabel}>Descrição (opcional)</Text><TextInput style={[styles.input, styles.textArea, formDisabled && styles.disabledBg]} value={description} onChangeText={setDescription} placeholder="Detalhes sobre o arquivo..." multiline numberOfLines={3} editable={!formDisabled}/></View>
            <View style={styles.inputField}><Text style={styles.inputLabel}>Tags</Text><TagInput tags={tags} onTagsChange={setTags} disabled={formDisabled} /></View>
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>{isEditing && existingFileName && !file ? 'Arquivo Atual' : 'Selecionar Arquivo *'}</Text>
              <TouchableOpacity onPress={pickDocument} style={[styles.filePickerButton, formDisabled && styles.disabledBg]} disabled={formDisabled}>
                <Ionicons name="document-attach-outline" size={22} color={(file || existingFileUrl) ? "#1D854C" : (formDisabled ? "#A0AEC0" : "#555")} />
                <Text style={[styles.filePickerText, (file || existingFileUrl) && styles.filePickerTextSelected, formDisabled && styles.disabledText]}>{file ? file.name : (existingFileName || 'Clique para selecionar')}</Text>
              </TouchableOpacity>
              {file && !isUploading && (<TouchableOpacity onPress={() => !formDisabled && setFile(null)} style={styles.removeFileButton} disabled={formDisabled}><Text style={[styles.removeFileText, formDisabled && styles.disabledText]}>Limpar</Text></TouchableOpacity>)}
              {isUploading && (<View style={styles.uploadProgressContainer}><Text style={styles.uploadProgressText}>Enviando: {uploadProgress}%</Text><View style={styles.progressBarBackground}><View style={[styles.progressBarForeground, { width: `${uploadProgress}%` }]} /></View></View>)}
            </View>
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>Permissões de Acesso</Text>
               <View style={styles.guestSearchContainer}>
                <TextInput style={[styles.input, {flex: 1, marginRight: 8}, formDisabled && styles.disabledBg]} value={permissionsSearch} onChangeText={setPermissionsSearch} placeholder="Buscar usuário por nome..." editable={!formDisabled}/>
                <TouchableOpacity onPress={handleSearchUsers} style={[styles.searchButton, formDisabled && styles.disabledBg]} disabled={isSearchingUsers || formDisabled}>
                    {isSearchingUsers ? <ActivityIndicator color="#fff" size="small"/> : <Ionicons name="search-outline" size={24} color={formDisabled ? "#A0AEC0" : "#fff"} />}
                </TouchableOpacity>
              </View>
              {foundUsers.length > 0 && (
                <View style={styles.foundUsersList}>
                    <ScrollView nestedScrollEnabled style={{maxHeight: 120}}>
                        {foundUsers.map(item => (
                            <TouchableOpacity key={item.id} style={styles.userItem} onPress={() => toggleUserPermission(item)} disabled={formDisabled}>
                                <Text style={styles.userItemText}>{item.name} ({item.email})</Text>
                                <Ionicons name={"square-outline"} size={22} color="#1D854C" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
              )}
               {Object.keys(selectedPermissions).length > 0 && (
                <View style={styles.selectedPermissionsContainer}>
                    <Text style={styles.selectedPermissionsTitle}>Acesso Permitido para:</Text>
                    <View style={styles.chipsWrapper}>
                    {Object.entries(selectedPermissions).map(([uid, permData]) => (
                        <View key={uid} style={styles.selectedPermissionChip}>
                            <Text style={styles.selectedPermissionName}>{permData.name}</Text>
                            <Text style={styles.selectedPermissionType}>({permData.type === 'owner' ? 'Prop.' : 'Ver'})</Text>
                            {permData.type !== 'owner' && ( <TouchableOpacity onPress={() => toggleUserPermission({ id: uid, name: permData.name })} style={{ marginLeft: 6 }} disabled={formDisabled}><Ionicons name="close-circle-outline" size={18} color="#D32F2F" /></TouchableOpacity>)}
                        </View>
                    ))}
                    </View>
                </View>
              )}
            </View>
            <TouchableOpacity style={[styles.confirmButton, formDisabled && styles.confirmButtonDisabled]} onPress={handleSaveFile} disabled={formDisabled}>
              {(isUploading || isLoadingForm) ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>{currentActionText}</Text>}
            </TouchableOpacity>
            {isEditing && existingFile.uploadedByUid === userData?.uid && (
                <TouchableOpacity style={[styles.deleteButton, formDisabled && styles.confirmButtonDisabled]} onPress={handleDeleteFile} disabled={formDisabled}>
                    <Ionicons name="trash-outline" size={20} color="#b91c1c" />
                    <Text style={styles.deleteButtonText}>Excluir Documento</Text>
                </TouchableOpacity>
            )}
          </View>
        </ScrollView>
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
  disabledBg: { backgroundColor: '#E5E7EB', },
  disabledText: { color: '#9CA3AF', },
  textArea: { textAlignVertical: 'top', paddingTop: 15, height: 100 },
  filePickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F4FF', borderRadius: 10, paddingVertical: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: '#D6E0FF', justifyContent: 'center', },
  filePickerText: { fontSize: 16, color: '#4A5C9B', marginLeft: 10, flexShrink: 1 },
  filePickerTextSelected: { color: '#1D854C', fontWeight: '500' },
  removeFileButton: { marginTop: 10, alignSelf: 'flex-end'},
  removeFileText: { color: '#EF4444', fontSize: 14, fontWeight: '500' },
  uploadProgressContainer: { marginTop: 12 },
  uploadProgressText: { fontSize: 13, color: '#374151', marginBottom: 6, textAlign: 'center' },
  progressBarBackground: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, overflow: 'hidden' },
  progressBarForeground: { height: '100%', backgroundColor: '#1D854C', borderRadius: 5 },
  confirmButton: { backgroundColor: '#1D854C', borderRadius: 10, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 25, elevation: 2, },
  confirmButtonDisabled: { backgroundColor: '#A5D6A7' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, height: 50, borderWidth: 1.5, marginBottom: 12, marginTop: 15, borderColor: '#dc2626', backgroundColor: '#fef2f2' },
  deleteButtonText: { marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#b91c1c' },
  tagInputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  addTagButton: { padding: 6 },
  tagsDisplayContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  tagChip: { flexDirection: 'row', backgroundColor: '#1D854C', borderRadius: 16, paddingVertical: 7, paddingHorizontal: 12, marginRight: 8, marginBottom: 8, alignItems: 'center', },
  tagText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
  guestSearchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  searchButton: { backgroundColor: '#1D854C', paddingHorizontal: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center', height: 52, },
  foundUsersList: { borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 8, backgroundColor: '#fff', marginTop: 8, },
  userItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', },
  userItemText: { fontSize: 15, color: '#374151'},
  selectedPermissionsContainer: { marginTop: 15, padding: 12, backgroundColor: '#E8F5E9', borderRadius: 8 },
  selectedPermissionsTitle: { fontSize: 14, fontWeight: '600', color: '#10502F', marginBottom: 10 },
  chipsWrapper: { flexDirection: 'row', flexWrap: 'wrap' },
  selectedPermissionChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#A7F3D0', alignSelf: 'flex-start', },
  selectedPermissionName: { color: '#065F46', fontWeight: '500', fontSize: 14 },
  selectedPermissionType: { color: '#047857', fontSize: 12, marginLeft: 4},
});