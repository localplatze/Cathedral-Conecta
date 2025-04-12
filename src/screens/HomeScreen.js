import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const HomeScreen = () => {
  // Dados de eventos para demonstração
  const events = [
    {
      id: 1,
      title: 'Reunião - Acompanhamento Semanal',
      date: '11/01/2025',
      time: '10h',
      location: 'Sala 04',
      isOnline: false,
    },
    {
      id: 2,
      title: 'Encontro 02',
      date: '12/01/2025',
      time: '17h',
      location: 'Online - Via Meet',
      isOnline: true,
    },
  ];

  // Dados dos atalhos
  const shortcuts = [
    {
      id: 1,
      title: 'Agenda',
      icon: <MaterialCommunityIcons name="calendar-month" size={28} color="#00A85A" />,
    },
    {
      id: 2,
      title: 'Arquivos',
      icon: <MaterialCommunityIcons name="file-document-outline" size={28} color="#00A85A" />,
    },
    {
      id: 3,
      title: 'Tarefas',
      icon: <MaterialCommunityIcons name="checkbox-marked-outline" size={28} color="#00A85A" />,
    },
    {
      id: 4,
      title: 'Notas',
      icon: <MaterialCommunityIcons name="note-text-outline" size={28} color="#00A85A" />,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>Olá, Eleonara!</Text>
        </View>
        <View style={styles.iconsContainer}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color="#00A85A" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="person-circle-outline" size={26} color="#00A85A" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Próximos Eventos Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Próximos Eventos:</Text>
          
          {events.length > 0 ? (
            events.map((event) => (
              <TouchableOpacity key={event.id} style={styles.eventCard}>
                <View style={styles.eventIconContainer}>
                  <MaterialCommunityIcons name="calendar" size={24} color="#00A85A" />
                </View>
                <View style={styles.eventDetails}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={styles.eventDateTimeContainer}>
                    <Text style={styles.eventDateTime}>{event.date} às {event.time}</Text>
                  </View>
                  <Text style={[
                    styles.eventLocation, 
                    event.isOnline && styles.onlineEventText
                  ]}>
                    {event.location}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noEventsContainer}>
              <Text style={styles.noEventsText}>Você não possui eventos nos próximos dias</Text>
            </View>
          )}
        </View>

        {/* Atalhos Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Atalhos:</Text>
          <View style={styles.shortcutsGrid}>
            {shortcuts.map((shortcut) => (
              <TouchableOpacity key={shortcut.id} style={styles.shortcutCard}>
                <View style={styles.shortcutIconContainer}>
                  {shortcut.icon}
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
    backgroundColor: '#FDF7E8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 2,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#00A85A',
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333333',
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  eventIconContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
  },
  eventDateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventDateTime: {
    fontSize: 14,
    color: '#666666',
  },
  eventLocation: {
    fontSize: 14,
    color: '#666666',
  },
  onlineEventText: {
    color: '#00A85A',
    fontWeight: '500',
  },
  noEventsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  noEventsText: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  shortcutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  shortcutIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shortcutTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
});