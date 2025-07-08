import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar, ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../AuthContext'; 
import { ref, onValue, query, orderByChild, startAt } from 'firebase/database';
import { FIREBASE_DB } from '../firebaseConnection';

export const HomeScreen = ({ navigation }) => {
  const { userData } = useAuth(); 
  const [userName, setUserName] = useState('Usuário');
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  useEffect(() => {
    if (userData && userData.uid) {
      setUserName(userData.name || 'Usuário');

      const todayISO = new Date().toISOString().split('T')[0];
      const eventsQuery = query(
        ref(FIREBASE_DB, 'events'),
        orderByChild('date'),
        startAt(todayISO)
      );

      const unsubscribeEvents = onValue(eventsQuery, (snapshot) => {
        const loadedEvents = [];
        snapshot.forEach((childSnapshot) => {
          const eventData = { id: childSnapshot.key, ...childSnapshot.val() };
          
          let isRelevant = false;
          if (eventData.createdBy === userData.uid) {
            isRelevant = true;
          } else if (eventData.attendees && eventData.attendees[userData.uid]) { 
            isRelevant = true;
          } else if (eventData.classId && userData.associatedClasses && userData.associatedClasses[eventData.classId]) { 
            isRelevant = true;
          }

          if (isRelevant) {
            loadedEvents.push(eventData);
          }
        });

        loadedEvents.sort((a, b) => {
          if (a.date < b.date) return -1;
          if (a.date > b.date) return 1;
          if (a.time < b.time) return -1;
          if (a.time > b.time) return 1;
          return 0;
        });

        setEvents(loadedEvents.slice(0, 3)); 
        setIsLoadingEvents(false);
      }, (error) => {
        console.error("Erro ao buscar eventos:", error);
        setEvents([]);
        setIsLoadingEvents(false);
      });

      return () => unsubscribeEvents();
    } else {
      setIsLoadingEvents(false); 
      setEvents([]);
      setUserName('Usuário');
    }
  }, [userData]);

   const shortcuts = useMemo(() => {
    const baseShortcuts = [
      { id: 1, title: 'Agenda', iconName: 'calendar-month-outline', screen: 'Agenda', color: '#4CAF50' },
      { id: 2, title: 'Arquivos', iconName: 'folder-open-outline', screen: 'Arquivos', color: '#2196F3' },
      { id: 3, title: 'Tarefas', iconName: 'checkbox-marked-circle-outline', screen: 'Tarefas', color: '#FF9800' },
    ];

    if (userData?.role === 'psicopedagogo') {
      return [
        ...baseShortcuts,
        { id: 4, title: 'Acompanhamentos', iconName: 'note-text-outline', screen: 'Notas', color: '#9C27B0' },
        { id: 5, title: 'Relatórios', iconName: 'chart-line', screen: 'Relatorios', color: '#E91E63' } 
      ];
    }
    
    return baseShortcuts;
  }, [userData]); 

  const formatDate = (dateString, timeString) => {
    try {
      const dateObj = new Date(dateString + 'T' + (timeString || "00:00:00"));
      if (isNaN(dateObj.getTime())) {
         const parts = dateString.split('/');
         if (parts.length === 3) {
            const isoDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
            const dateObjFromDDMMYYYY = new Date(isoDateStr + 'T' + (timeString || "00:00:00"));
            if (!isNaN(dateObjFromDDMMYYYY.getTime())) {
                return `${dateObjFromDDMMYYYY.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às ${timeString || ''}`;
            }
         }
         return `${dateString} às ${timeString || ''}`; 
      }
      return `${dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às ${timeString || ''}`;
    } catch (e) {
      return `${dateString} às ${timeString || ''}`;
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileContainer}>
          <View style={styles.defaultAvatar}>
            <Ionicons name="person-circle-outline" size={40} color="#1D854C" />
          </View>
          <View>
            <Text style={styles.greetingSubText}>Bem-vindo(a),</Text>
            <Text style={styles.greetingText}>{userName}!</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Próximos Eventos</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Agenda')}>
                <Text style={styles.seeAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          {isLoadingEvents ? (
            <ActivityIndicator size="large" color="#1D854C" style={styles.loader} />
          ) : events.length > 0 ? (
            events.map((event) => (
              <TouchableOpacity 
                key={event.id} 
                style={styles.eventCard}
                onPress={() => navigation.navigate('Agenda', { eventId: event.id, screenTitle: event.title })}
              >
                <View style={[styles.eventIconContainer, {backgroundColor: event.isOnline ? '#E3F2FD' : '#E8F5E9'}]}>
                  <MaterialCommunityIcons 
                    name={event.isOnline ? "video-outline" : "calendar-today"} // Ícone atualizado
                    size={24} 
                    color={event.isOnline ? '#2196F3' : '#4CAF50'} />
                </View>
                <View style={styles.eventDetails}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                  <Text style={styles.eventDateTime}>
                    {formatDate(event.date, event.time)}
                  </Text>
                  <Text style={styles.eventLocation} numberOfLines={1}>
                    <Ionicons name="location-outline" size={14} color="#757575" /> {event.location}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#BDBDBD" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={48} color="#CBD5E0" />
              <Text style={styles.emptyStateText}>Nenhum evento relevante nos próximos dias.</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Acesso Rápido</Text>
          <View style={styles.shortcutsGrid}>
            {shortcuts.map((shortcut) => (
              <TouchableOpacity
                onPress={() => navigation.navigate(shortcut.screen)}
                key={shortcut.id} 
                style={styles.shortcutCard}
                activeOpacity={0.8}
              >
                <View style={[styles.shortcutIconContainer, { backgroundColor: `${shortcut.color}25` }]}>
                  <MaterialCommunityIcons name={shortcut.iconName} size={30} color={shortcut.color} />
                </View>
                <Text style={styles.shortcutTitle}>{shortcut.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  defaultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  greetingSubText: {
    fontSize: 13,
    color: '#6B7280',
  },
  greetingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937', 
  },
  headerIconsContainer: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
  },
  scrollContent: {
    flexGrow: 1, 
    paddingHorizontal: 20,
  },
  sectionContainer: {
    paddingVertical: 24, 
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18, 
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    color: '#1D854C',
    fontWeight: '600',
  },
  loader: {
    marginVertical: 30,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2, 
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  eventIconContainer: {
    width: 48, 
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  eventDetails: {
    flex: 1,
    marginRight: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 5,
  },
  eventDateTime: {
    fontSize: 14,
    color: '#4B5563', 
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#6B7280',
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50, 
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 10,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  shortcutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
    width: '48%', 
    marginBottom: 16,
    minHeight: 130,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  shortcutIconContainer: {
    width: 56, 
    height: 56,
    borderRadius: 16, 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  shortcutTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151', 
    textAlign: 'center',
  },
});