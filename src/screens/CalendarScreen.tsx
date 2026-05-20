import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EventCard from '../components/EventCard';
import { Event, MarkedDates } from '../types';

// --- Mock data ---
const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Team Standup',
    description: 'Daily sync with the engineering team',
    date: getTodayString(),
    startTime: '09:00',
    endTime: '09:30',
    color: '#6366f1',
  },
  {
    id: '2',
    title: 'Design Review',
    description: 'Review new UI mockups for Agenda',
    date: getTodayString(),
    startTime: '11:00',
    endTime: '12:00',
    color: '#0f9b8e',
  },
  {
    id: '3',
    title: 'Lunch with Sara',
    date: getTodayString(),
    startTime: '13:00',
    endTime: '14:00',
    color: '#f59e0b',
  },
  {
    id: '4',
    title: 'Sprint Planning',
    description: 'Plan tasks for the upcoming sprint',
    date: getOffsetDate(1),
    startTime: '10:00',
    endTime: '11:30',
    color: '#e94560',
  },
  {
    id: '5',
    title: 'Doctor Appointment',
    date: getOffsetDate(3),
    startTime: '15:00',
    endTime: '16:00',
    color: '#10b981',
  },
];

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getOffsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = getTodayString();
  const tomorrow = getOffsetDate(1);
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(getTodayString());

  const markedDates: MarkedDates = useMemo(() => {
    const marks: MarkedDates = {};
    MOCK_EVENTS.forEach(event => {
      marks[event.date] = { marked: true, dotColor: event.color };
    });
    return marks;
  }, []);

  const markedWithSelected = useMemo(() => ({
    ...markedDates,
    [selectedDate]: {
      ...(markedDates[selectedDate] || {}),
      selected: true,
      selectedColor: '#6366f1',
    },
  }), [markedDates, selectedDate]);

  const dayEvents = useMemo(
    () =>
      MOCK_EVENTS
        .filter(e => e.date === selectedDate)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [selectedDate],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agenda</Text>
      </View>

      {/* Calendar */}
      <Calendar
        testID="calendar"
        current={selectedDate}
        onDayPress={day => setSelectedDate(day.dateString)}
        markedDates={markedWithSelected}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          selectedDayBackgroundColor: '#6366f1',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#6366f1',
          dayTextColor: '#1a1a2e',
          textDisabledColor: '#d1d5db',
          dotColor: '#6366f1',
          arrowColor: '#6366f1',
          monthTextColor: '#1a1a2e',
          textMonthFontWeight: '700',
          textDayFontSize: 14,
          textMonthFontSize: 16,
        }}
        style={styles.calendar}
      />

      {/* Events section */}
      <View style={styles.eventsSection}>
        <Text style={styles.eventsTitle}>{formatDisplayDate(selectedDate)}</Text>
        {dayEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No events scheduled</Text>
          </View>
        ) : (
          <FlatList
            data={dayEvents}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <EventCard event={item} />}
            contentContainerStyle={styles.eventsList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  calendar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  eventsSection: {
    flex: 1,
  },
  eventsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  eventsList: {
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 48,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#9ca3af',
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: '#ffffff',
    lineHeight: 32,
  },
});
