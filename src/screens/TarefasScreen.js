import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, FlatList, ActivityIndicator, Alert, Platform, Image
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { NewTaskModal } from './NewTaskModal';
import { useAuth } from '../AuthContext';
import { FIREBASE_DB } from '../firebaseConnection';
import { ref, onValue, query, orderByChild, update, serverTimestamp, remove as fbRemove } from 'firebase/database';

const getPriorityStyle = (priority) => {
    switch(priority) {
      case 'alta': return { color: '#EF4444', name: 'arrow-up-circle-outline' };
      case 'media': return { color: '#F59E0B', name: 'ellipse-outline' };
      case 'baixa': return { color: '#10B981', name: 'arrow-down-circle-outline' };
      default: return { color: '#6B7280', name: 'remove-circle-outline' };
    }
};

const getStatusStyle = (status) => {
    switch(status) {
        case 'pending': return { color: '#60A5FA', label: 'Pendente', icon: 'hourglass-outline' };
        case 'in_progress': return { color: '#FBBF24', label: 'Em Progresso', icon: 'sync-circle-outline' };
        case 'completed': return { color: '#34D399', label: 'Concluída', icon: 'checkmark-done-circle-outline' };
        case 'cancelled': return { color: '#F87171', label: 'Cancelada', icon: 'close-circle-outline' };
        default: return { color: '#9CA3AF', label: 'Todas', icon: 'list-outline' };
    }
};

export const TarefasScreen = ({ navigation }) => {
  const { userData } = useAuth();
  const [viewType, setViewType] = useState('pending');
  const [allTasks, setAllTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!userData || !userData.uid) {
      setIsLoading(false); setAllTasks([]); return;
    }
    setIsLoading(true);
    const tasksRef = query(ref(FIREBASE_DB, 'tasks'), orderByChild('createdAt'));
    const unsubscribe = onValue(tasksRef, (snapshot) => {
      const loadedTasks = [];
      if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
          const task = { id: childSnapshot.key, ...childSnapshot.val() };
          if (task.createdByUid === userData.uid || (task.assignedTo && task.assignedTo[userData.uid])) {
            loadedTasks.push(task);
          }
        });
      }
      setAllTasks(loadedTasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      setIsLoading(false);
    }, (error) => {
      Alert.alert("Erro", "Não foi possível carregar as tarefas."); setIsLoading(false);
    });
    return () => unsubscribe();
  }, [userData]);

  const filteredTasks = useMemo(() => {
    if (viewType === 'all') return allTasks.filter(task => task.status !== 'cancelled');
    return allTasks.filter(task => task.status === viewType);
  }, [allTasks, viewType]);

  const handleOpenTaskModal = (task = null) => {
    setSelectedTask(task);
    setModalVisible(true);
  };

  const quickToggleStatus = async (task) => {
    if (!task || !task.id) return;
    let newStatus;
    if (task.status === 'pending') newStatus = 'in_progress';
    else if (task.status === 'in_progress') newStatus = 'completed';
    else if (task.status === 'completed') newStatus = 'pending';
    else return;
    try {
        await update(ref(FIREBASE_DB, `tasks/${task.id}`), { status: newStatus, updatedAt: serverTimestamp() });
    } catch (error) { Alert.alert("Erro", "Falha ao atualizar status."); }
  };

  const handleDeleteTask = async (taskToDelete) => {
    if (!taskToDelete || taskToDelete.createdByUid !== userData?.uid) {
        Alert.alert("Ação não permitida", "Você só pode excluir tarefas que você criou."); return;
    }
    Alert.alert("Confirmar Exclusão", `Excluir a tarefa "${taskToDelete.title}"?`,
        [ { text: "Cancelar", style: "cancel" },
          { text: "Excluir", style: "destructive", onPress: async () => {
                setIsDeleting(true);
                try {
                    await fbRemove(ref(FIREBASE_DB, `tasks/${taskToDelete.id}`));
                    Alert.alert("Sucesso", "Tarefa excluída.");
                } catch (error) { Alert.alert("Erro", "Não foi possível excluir a tarefa."); }
                finally { setIsDeleting(false); }
            }}
        ], { cancelable: true }
    );
  };

  const renderTarefaCard = ({ item }) => {
    const priorityStyle = getPriorityStyle(item.priority);
    const statusStyle = getStatusStyle(item.status);
    const canModify = item.createdByUid === userData?.uid || (item.assignedTo && item.assignedTo[userData.uid]);
    const canDelete = item.createdByUid === userData?.uid;
    const isCancelled = item.status === 'cancelled';
    const isCompleted = item.status === 'completed';

    return (
        <TouchableOpacity style={[taskStyles.tarefaCard, (isCompleted || isCancelled) && taskStyles.tarefaCardDisabled]} activeOpacity={0.8} onPress={() => handleOpenTaskModal(item)} onLongPress={canDelete ? () => handleDeleteTask(item) : null}>
            <View style={taskStyles.cardHeader}>
                <TouchableOpacity style={taskStyles.statusIndicatorButton} onPress={() => canModify && quickToggleStatus(item)} disabled={!canModify || isDeleting || isCancelled}>
                    <Ionicons name={statusStyle.icon} size={26} color={canModify ? statusStyle.color : '#B0BEC5'} />
                </TouchableOpacity>
                <Text style={[taskStyles.tarefaTitle, (isCompleted || isCancelled) && taskStyles.tarefaTitleDisabled]} numberOfLines={2}>
                    {item.title}
                </Text>
                <View style={[taskStyles.priorityIndicator, { borderColor: priorityStyle.color, backgroundColor: `${priorityStyle.color}20` }]}>
                    <Ionicons name={priorityStyle.name} size={18} color={priorityStyle.color} />
                </View>
            </View>
            {item.description ? (<Text style={taskStyles.tarefaDescription} numberOfLines={2}>{item.description}</Text>) : null}
            <View style={taskStyles.cardFooter}>
                <View style={taskStyles.dueDateContainer}>
                    <Ionicons name="calendar-outline" size={15} color="#6B7280" />
                    <Text style={taskStyles.tarefaDueDate}>Prazo: {item.dueDate ? new Date(item.dueDate + "T00:00:00").toLocaleDateString('pt-BR') : 'N/A'}</Text>
                </View>
                {item.assignedTo && Object.keys(item.assignedTo).length > 0 && (
                    <View style={taskStyles.assignedAvatarsContainer}>
                        {Object.entries(item.assignedTo).slice(0, 3).map(([uid, user], index) => (
                            <View key={uid} style={[taskStyles.avatarSmall, { zIndex: 3-index, marginLeft: index > 0 ? -8 : 0 }]}>
                                {user.avatarUrl ? <Image source={{uri: user.avatarUrl}} style={taskStyles.avatarImage} /> : <Text style={taskStyles.avatarInitial}>{user.name ? user.name.charAt(0).toUpperCase() : '?'}</Text>}
                            </View>
                        ))}
                        {Object.keys(item.assignedTo).length > 3 && (<Text style={taskStyles.moreAssignees}>+{Object.keys(item.assignedTo).length - 3}</Text>)}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={taskStyles.container}>
      <StatusBar backgroundColor="#1D854C" barStyle="light-content" />
      <View style={taskStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={taskStyles.headerButton}><Ionicons name="arrow-back-outline" size={26} color="#FFFFFF"/></TouchableOpacity>
        <Text style={taskStyles.headerTitle}>Gerenciar Tarefas</Text>
        <View style={{width: 38}} />
      </View>
      <View style={taskStyles.viewTypeContainer}>
        {['pending', 'in_progress', 'completed', 'all'].map(type => (
            <TouchableOpacity key={type} style={[taskStyles.viewTypeButton, viewType === type && taskStyles.viewTypeButtonActive]} onPress={() => setViewType(type)}>
                <Text style={[taskStyles.viewTypeText, viewType === type && taskStyles.viewTypeTextActive]}>{getStatusStyle(type).label}</Text>
            </TouchableOpacity>
        ))}
      </View>

      {isLoading && !filteredTasks.length ? (
         <View style={taskStyles.fullScreenLoader}><ActivityIndicator size="large" color="#1D854C" /><Text style={taskStyles.loadingText}>Carregando tarefas...</Text></View>
      ) : (
        <FlatList
          data={filteredTasks} renderItem={renderTarefaCard} keyExtractor={item => item.id.toString()} contentContainerStyle={taskStyles.tarefasList}
          ListEmptyComponent={() => {
            const labelForEmpty = viewType === 'all' ? 'tarefas ativas' : getStatusStyle(viewType).label.toLowerCase();
            return (
                <View style={taskStyles.emptyStateContainer}>
                    <Ionicons name="file-tray-stacked-outline" size={60} color="#CBD5E0" />
                    <Text style={taskStyles.emptyStateText}>Nenhuma tarefa encontrada</Text>
                    <Text style={taskStyles.emptyStateSubText}>{allTasks.length === 0 ? "Crie a primeira tarefa no botão '+'." : `Não há ${labelForEmpty} no momento.`}</Text>
                </View>
            );
          }}
        />
      )}
      <TouchableOpacity style={[taskStyles.addButton, isDeleting && taskStyles.buttonDisabled]} onPress={() => !isDeleting && handleOpenTaskModal()} disabled={isDeleting}>
        {isDeleting ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name="add" size={32} color="#FFFFFF" />}
      </TouchableOpacity>
      <NewTaskModal isVisible={isModalVisible} onClose={() => { setModalVisible(false); setSelectedTask(null); }} onTaskSaved={() => {}} existingTask={selectedTask}/>
    </SafeAreaView>
  );
};

const taskStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { height: 60, backgroundColor: '#1D854C', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, elevation: 4, },
  headerButton: { padding: 10 },
  headerTitle: { fontSize: 20, color: '#FFFFFF', fontWeight: '600' },
  viewTypeContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, paddingHorizontal: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', },
  viewTypeButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#F3F4F6', },
  viewTypeButtonActive: { backgroundColor: '#D1FAE5' }, 
  viewTypeText: { fontSize: 14, color: '#374151', fontWeight: '500' }, 
  viewTypeTextActive: { color: '#065F46', fontWeight: '600' },
  fullScreenLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', },
  loadingText: { marginTop: 10, fontSize: 16, color: '#1D854C', },
  tarefasList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 90 },
  tarefaCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, },
  tarefaCardDisabled: { backgroundColor: '#F9FAFB', },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, },
  statusIndicatorButton: { paddingRight: 10, },
  tarefaTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#1F2937', },
  tarefaTitleDisabled: { textDecorationLine: 'line-through', color: '#9CA3AF', fontWeight: '500', },
  priorityIndicator: { marginLeft: 10, padding: 6, borderRadius: 18, borderWidth: 1.5, },
  tarefaDescription: { fontSize: 14, color: '#4B5563', marginBottom: 12, lineHeight: 20, },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6', },
  dueDateContainer: { flexDirection: 'row', alignItems: 'center', },
  tarefaDueDate: { fontSize: 13, color: '#6B7280', marginLeft: 6, },
  assignedAvatarsContainer: { flexDirection: 'row', alignItems: 'center', },
  avatarSmall: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FFFFFF', },
  avatarImage: { width: '100%', height: '100%', borderRadius: 15, },
  avatarInitial: { color: '#4338CA', fontSize: 13, fontWeight: 'bold' }, 
  moreAssignees: { fontSize: 12, color: '#6B7280', marginLeft: -4, backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10},
  emptyStateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, marginTop: 40 },
  emptyStateText: { marginTop: 16, fontSize: 17, fontWeight: '500', color: '#6B7280', textAlign: 'center' },
  emptyStateSubText: { marginTop: 8, fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  addButton: { position: 'absolute', right: 20, bottom: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: '#1D854C', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#052e16', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, },
  buttonDisabled: { backgroundColor: '#A5D6A7', }
});