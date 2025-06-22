import React, { useState, useEffect, useMemo } from 'react'; 
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform,
  StatusBar, ScrollView, FlatList, ActivityIndicator, Alert, Dimensions
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { NewEventModal } from './NewEventModal';
import { useAuth } from '../AuthContext';
import { FIREBASE_DB } from '../firebaseConnection';
import { ref, onValue, query, orderByChild } from 'firebase/database';

LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt-br';

const formatDateToYYYYMMDD = (date) => date.toISOString().split('T')[0];
const screenWidth = Dimensions.get('window').width;

const getWeekDays = (currentDateStr) => {
    const week = [];
    const currentDate = new Date(currentDateStr + "T00:00:00");
    const dayOfWeek = currentDate.getDay();
    const startDate = new Date(currentDate);
    startDate.setDate(currentDate.getDate() - dayOfWeek);
    const dayNamesToUse = LocaleConfig.locales['pt-br'].dayNamesShort || ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

    for (let i = 0; i < 7; i++) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        const dayIdx = day.getDay();
        week.push({
            dateString: formatDateToYYYYMMDD(day),
            dayOfMonth: day.getDate(),
            dayNameShort: dayNamesToUse[dayIdx].substring(0,3),
        });
    }
    return week;
};

export const AgendaScreen = ({ navigation, route }) => {
  const { userData } = useAuth(); 
  const [viewMode, setViewMode] = useState('diario');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allEvents, setAllEvents] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [headerTitle, setHeaderTitle] = useState("Minha Agenda");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const selectedDateYYYYMMDD = useMemo(() => formatDateToYYYYMMDD(currentDate), [currentDate]);
  const currentWeekDays = useMemo(() => getWeekDays(selectedDateYYYYMMDD), [selectedDateYYYYMMDD]);

  useEffect(() => {
    if (route.params?.screenTitle) {
      setHeaderTitle(route.params.screenTitle);
    } else {
        if (viewMode === 'diario') {
            setHeaderTitle(new Date(selectedDateYYYYMMDD + "T00:00:00").toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
        } else {
            setHeaderTitle("Minha Agenda");
        }
    }
  }, [route.params, selectedDateYYYYMMDD, viewMode]);

  useEffect(() => {
    if (!userData || !userData.uid) {
      setIsLoading(false); 
      setAllEvents({});
      return;
    }
    setIsLoading(true);
    const eventsQuery = query(ref(FIREBASE_DB, 'events'), orderByChild('date'));
    const unsubscribe = onValue(eventsQuery, (snapshot) => {
      const loadedEventsByDate = {};
      if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
          const event = { id: childSnapshot.key, ...childSnapshot.val() };
          let isRelevant = false;
          if (event.createdBy === userData.uid || (event.attendees && event.attendees[userData.uid])) {
            isRelevant = true;
          }
          if (isRelevant) {
            const eventDate = event.date;
            if (!loadedEventsByDate[eventDate]) {
              loadedEventsByDate[eventDate] = [];
            }
            loadedEventsByDate[eventDate].push(event);
            loadedEventsByDate[eventDate].sort((a,b) => (a.time || "00:00").localeCompare(b.time || "00:00"));
          }
        });
      }
      setAllEvents(loadedEventsByDate);
      setIsLoading(false);
    }, (error) => {
      console.error("Erro ao carregar eventos:", error);
      Alert.alert("Erro", "Não foi possível carregar os eventos.");
      setIsLoading(false);
    });
    return () => unsubscribe(); 
  }, [userData]);

  const eventsForSelectedDate = useMemo(() => {
    return allEvents[selectedDateYYYYMMDD] || [];
  }, [allEvents, selectedDateYYYYMMDD]);

  const eventsForWeek = useMemo(() => {
    const weekEvents = {};
    currentWeekDays.forEach(day => { weekEvents[day.dateString] = allEvents[day.dateString] || []; });
    return weekEvents;
  }, [allEvents, currentWeekDays]);

  const markedDatesForCalendar = useMemo(() => {
    const marks = {};
    Object.keys(allEvents).forEach(dateString => {
        if(allEvents[dateString] && allEvents[dateString].length > 0) { 
            marks[dateString] = { marked: true, dotColor: '#1D854C' };
        }
    });
    if (marks[selectedDateYYYYMMDD]) {
      marks[selectedDateYYYYMMDD] = { ...marks[selectedDateYYYYMMDD], selected: true, selectedColor: '#1D854C' };
    } else {
      marks[selectedDateYYYYMMDD] = { selected: true, selectedColor: '#1D854C' };
    }
    return marks;
  }, [allEvents, selectedDateYYYYMMDD]);

  const handleOpenEventModal = (event = null) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const changeDate = (amount, unit) => {
    const newDate = new Date(currentDate);
    if (unit === 'day') newDate.setDate(newDate.getDate() + amount);
    if (unit === 'week') newDate.setDate(newDate.getDate() + (amount * 7));
    if (unit === 'month') {
        const currentMonth = newDate.getMonth();
        newDate.setMonth(currentMonth + amount);
        if (newDate.getMonth() !== (currentMonth + amount + 12) % 12) { newDate.setDate(0); }
    }
    setCurrentDate(newDate);
  };

  const onCalendarDayPress = (day) => {
    setCurrentDate(new Date(day.dateString + "T00:00:00"));
    setViewMode('diario');
  };

  const renderEventCard = ({ item, cardStyle }) => {
    const isConcluded = item.status === 'concluded';
    const isCancelled = item.status === 'cancelled';
    const isDisabled = isConcluded || isCancelled;
    let indicatorColor = item.isOnline ? '#3B82F6' : '#10B981';
    if (isConcluded) indicatorColor = '#6B7280';
    if (isCancelled) indicatorColor = '#EF4444';

    return (
    <TouchableOpacity style={[agendaStyles.eventCard, cardStyle, isDisabled && agendaStyles.eventCardDisabled]} activeOpacity={0.7} onPress={() => handleOpenEventModal(item)}>
      <View style={[agendaStyles.eventIndicator, { backgroundColor: indicatorColor }]} />
      <View style={agendaStyles.eventInfo}>
        <Text style={[agendaStyles.eventTitle, isCancelled && agendaStyles.eventTitleCancelled]} numberOfLines={1}>{item.title}</Text>
        <Text style={agendaStyles.eventDetails}><Ionicons name="time-outline" size={14} color="#6B7280" /> {item.time}</Text>
        <Text style={agendaStyles.eventLocation} numberOfLines={1}><Ionicons name={item.isOnline ? 'videocam-outline' : 'location-outline'} size={14} color="#6B7280" /> {item.location}</Text>
      </View>
      {isConcluded && <Ionicons name="checkmark-circle" size={24} color="#16a34a" style={{marginRight: 4}} />}
      {isCancelled && <Ionicons name="remove-circle" size={24} color="#dc2626" style={{marginRight: 4}} />}
      {!isDisabled && <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
    </TouchableOpacity>
  )};

  const renderDayColumnForWeek = (dayDateString) => {
    const dayEvents = eventsForWeek[dayDateString] || [];
    const dayInfo = currentWeekDays.find(d => d.dateString === dayDateString);
    return (
        <TouchableOpacity key={dayDateString} style={agendaStyles.weekDayColumn} onPress={() => { setCurrentDate(new Date(dayDateString + "T00:00:00")); setViewMode('diario'); }} activeOpacity={0.9}>
            <View style={[agendaStyles.weekDayHeader, dayDateString === selectedDateYYYYMMDD && agendaStyles.weekDayHeaderSelected]}>
                <Text style={[agendaStyles.weekDayLabelShort, dayDateString === selectedDateYYYYMMDD && agendaStyles.weekDayLabelSelectedText]}>{dayInfo?.dayNameShort}</Text>
                <Text style={[agendaStyles.weekDayNumber, dayDateString === selectedDateYYYYMMDD && agendaStyles.weekDayNumberSelected]}>{dayInfo?.dayOfMonth}</Text>
            </View>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 5, flexGrow: 1}}>
                {dayEvents.length > 0 ? (dayEvents.map(event => renderEventCard({item: event, cardStyle: agendaStyles.weekEventCard }))) 
                : (<View style={agendaStyles.weekEmptySlot}><Text style={agendaStyles.weekEmptyText}>-</Text></View>)}
            </ScrollView>
        </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (isLoading && !Object.keys(allEvents).length) { return <ActivityIndicator style={{ flex: 1, marginTop: 50 }} size="large" color="#1D854C" />; }
    if (viewMode === 'mensal') {
      return (
        <Calendar
          current={selectedDateYYYYMMDD}
          onDayPress={onCalendarDayPress}
          markedDates={markedDatesForCalendar}
          onMonthChange={(month) => setCurrentDate(new Date(month.dateString + "T00:00:00"))}
          monthFormat={'MMMM yyyy'}
          theme={{ calendarBackground: '#FFFFFF', textSectionTitleColor: '#4A5568', selectedDayBackgroundColor: '#1D854C', selectedDayTextColor: '#ffffff', todayTextColor: '#1D854C', dayTextColor: '#1F2937', textDisabledColor: '#D1D5DB', dotColor: '#1D854C', selectedDotColor: '#ffffff', arrowColor: '#1D854C', monthTextColor: '#1D854C', textDayFontWeight: '400', textMonthFontWeight: '600', textDayHeaderFontWeight: '500', textDayFontSize: 16, textMonthFontSize: 18, textDayHeaderFontSize: 14, 'stylesheet.calendar.header': { week: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 1, borderColor: '#E5E7EB', paddingBottom: 10, marginBottom: 8, } } }}
          style={agendaStyles.calendarView}
        />
      );
    }
    if (viewMode === 'semanal') {
      return (
        <View style={{flex: 1}}>
            <View style={agendaStyles.weekNavigation}>
                <TouchableOpacity onPress={() => changeDate(-1, 'week')} style={agendaStyles.weekNavButton}><Ionicons name="chevron-back" size={26} color="#1D854C" /></TouchableOpacity>
                <Text style={agendaStyles.weekNavTitle}>{`${currentWeekDays[0]?.dayOfMonth} ${LocaleConfig.locales['pt-br'].monthNamesShort[new Date(currentWeekDays[0]?.dateString + "T00:00:00").getMonth()]} - ${currentWeekDays[6]?.dayOfMonth} ${LocaleConfig.locales['pt-br'].monthNamesShort[new Date(currentWeekDays[6]?.dateString + "T00:00:00").getMonth()]}, ${new Date(currentWeekDays[0]?.dateString + "T00:00:00").getFullYear()}`}</Text>
                <TouchableOpacity onPress={() => changeDate(1, 'week')} style={agendaStyles.weekNavButton}><Ionicons name="chevron-forward" size={26} color="#1D854C" /></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={agendaStyles.weekDaysContainer}>{currentWeekDays.map(day => renderDayColumnForWeek(day.dateString))}</ScrollView>
        </View>
      );
    }
    return (
        <View style={{flex: 1}}>
            <View style={agendaStyles.dayNavigation}>
                <TouchableOpacity onPress={() => changeDate(-1, 'day')} style={agendaStyles.dayNavButton}><Ionicons name="chevron-back-outline" size={24} color="#333" /></TouchableOpacity>
                <TouchableOpacity onPress={() => setViewMode('mensal')}><Text style={agendaStyles.dayNavTitle}>{new Date(selectedDateYYYYMMDD + "T00:00:00").toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })}</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => changeDate(1, 'day')} style={agendaStyles.dayNavButton}><Ionicons name="chevron-forward-outline" size={24} color="#333" /></TouchableOpacity>
            </View>
            <FlatList
                data={eventsForSelectedDate}
                renderItem={renderEventCard}
                keyExtractor={item => item.id.toString()}
                ListEmptyComponent={() => (<View style={agendaStyles.emptyStateContainer}><Ionicons name="calendar-outline" size={60} color="#CBD5E0" /><Text style={agendaStyles.emptyStateText}>Sem eventos para este dia.</Text><Text style={agendaStyles.emptyStateSubText}>Relaxe ou adicione um novo evento!</Text></View>)}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 80 }}
            />
        </View>
    );
  };

  return (
    <SafeAreaView style={agendaStyles.container}>
      <StatusBar backgroundColor="#1D854C" barStyle="light-content" />
      <View style={agendaStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={agendaStyles.headerButton}><Ionicons name="arrow-back-outline" size={26} color="#FFFFFF"/></TouchableOpacity>
        <Text style={agendaStyles.headerTitle}>{headerTitle}</Text>
        <TouchableOpacity onPress={() => setCurrentDate(new Date())} style={agendaStyles.headerButton}><Ionicons name="today-outline" size={24} color="#FFFFFF" /></TouchableOpacity>
      </View>
      <View style={agendaStyles.viewModeSelector}>
        {['diario', 'semanal', 'mensal'].map(mode => (
          <TouchableOpacity key={mode} style={[agendaStyles.modeButton, viewMode === mode && agendaStyles.modeButtonActive]} onPress={() => setViewMode(mode)}>
            <Text style={[agendaStyles.modeButtonText, viewMode === mode && agendaStyles.modeButtonTextActive]}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={agendaStyles.content}>{renderContent()}</View>
      {userData && userData.uid && (
        <TouchableOpacity style={agendaStyles.addButton} onPress={() => handleOpenEventModal()}><MaterialIcons name="add" size={32} color="#FFFFFF" /></TouchableOpacity>
      )}
      <NewEventModal
        isVisible={isModalVisible}
        onClose={() => { setModalVisible(false); setSelectedEvent(null); }}
        onEventSaved={() => {}}
        existingEvent={selectedEvent} 
      />
    </SafeAreaView>
  );
};

const agendaStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', },
  header: { height: 60, backgroundColor: '#1D854C', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, elevation: 4, },
  headerButton: { padding: 10, },
  headerTitle: { fontSize: 20, color: '#FFFFFF', fontWeight: '600', },
  viewModeSelector: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', },
  modeButton: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, },
  modeButtonActive: { backgroundColor: '#D1FAE5', },
  modeButtonText: { fontSize: 15, color: '#374151', fontWeight: '500', },
  modeButtonTextActive: { color: '#065F46', fontWeight: '600', },
  content: { flex: 1, },
  calendarView: { marginHorizontal: 16, marginTop: 10, borderRadius: 12, },
  dayNavigation: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', },
  dayNavButton: { padding: 10 }, 
  dayNavTitle: { fontSize: 17, fontWeight: '600', color: '#1D854C' },
  weekNavigation: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', },
  weekNavButton: { padding: 10 },
  weekNavTitle: { fontSize: 16, fontWeight: '600', color: '#1D854C', textAlign: 'center', flex: 1 }, 
  weekDaysContainer: { backgroundColor: '#F9FAFB', paddingVertical: 8, paddingHorizontal: 4, },
  weekDayColumn: { width: screenWidth / 3.2, minHeight: 200, marginHorizontal: 5, backgroundColor: '#FFFFFF', borderRadius: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, paddingBottom: 8, overflow: 'hidden', },
  weekDayHeader: { paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#F9FAFB', },
  weekDayHeaderSelected: { backgroundColor: '#1D854C', borderTopLeftRadius: 10, borderTopRightRadius: 10, },
  weekDayLabelShort: { fontSize: 13, color: '#6B7280', fontWeight: '500', textTransform: 'uppercase' }, 
  weekDayNumber: { fontSize: 18, color: '#1F2937', fontWeight: '600', marginTop: 4 }, 
  weekDayNumberSelected: { color: '#FFFFFF' }, 
  weekDayLabelSelectedText: { color: '#FFFFFF' },
  weekEventCard: { marginVertical: 6, marginHorizontal: 8, paddingVertical: 10, paddingHorizontal: 10, },
  weekEmptySlot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 15, minHeight: 60, },
  weekEmptyText: { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }, 
  eventCard: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 15, marginHorizontal: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, },
  eventCardDisabled: { backgroundColor: '#F9FAFB', opacity: 0.8, },
  eventIndicator: { width: 6, height: 45, borderRadius: 3, marginRight: 15, },
  eventInfo: { flex: 1, marginRight: 8 },
  eventTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 5 },
  eventTitleCancelled: { textDecorationLine: 'line-through', color: '#9CA3AF', },
  eventDetails: { fontSize: 13, color: '#4B5563', marginBottom: 3, flexDirection: 'row', alignItems: 'center' },
  eventLocation: { fontSize: 13, color: '#6B7280', flexDirection: 'row', alignItems: 'center' },
  emptyStateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, marginTop: 30, },
  emptyStateText: { marginTop: 16, fontSize: 17, fontWeight: '500', color: '#6B7280', textAlign: 'center' },
  emptyStateSubText: { marginTop: 8, fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  addButton: { position: 'absolute', right: 20, bottom: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: '#1D854C', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#052e16', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, },
});