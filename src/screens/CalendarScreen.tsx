import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import AddEventModal, { NewEventData } from '../components/AddEventModal';
import EventCard from '../components/EventCard';
import { addEvent } from '../services/events';
import { DateString, MarkedDates, toDateString } from '../types';
import { useAllEvents, useEvents } from '../hooks/useEvents';

function getTodayString(): DateString {
  return toDateString(new Date().toISOString().split('T')[0]);
}

function getOffsetDate(days: number): DateString {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateString(d.toISOString().split('T')[0]);
}

function formatDisplayDate(dateStr: DateString): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = getTodayString();
  const tomorrow = getOffsetDate(1);
  if (dateStr === today) { return 'Today'; }
  if (dateStr === tomorrow) { return 'Tomorrow'; }
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatEmptyStateDate(dateStr: DateString): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

interface Props {
  user: FirebaseAuthTypes.User;
  onSignOut: () => void;
}

export default function CalendarScreen({ user, onSignOut }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState<DateString>(getTodayString());
  const [modalVisible, setModalVisible] = useState(false);

  const { events: dayEvents, loading } = useEvents(user.uid, selectedDate);
  const allEvents = useAllEvents(user.uid);

  const markedDates: MarkedDates = useMemo(() => {
    const marks: MarkedDates = {};
    allEvents.forEach(event => {
      marks[event.date] = { marked: true, dotColor: event.color };
    });
    return marks;
  }, [allEvents]);

  const markedWithSelected = useMemo(() => ({
    ...markedDates,
    [selectedDate]: {
      ...(markedDates[selectedDate] || {}),
      selected: true,
      selectedColor: '#6366f1',
    },
  }), [markedDates, selectedDate]);

  const handleSaveEvent = async (data: NewEventData) => {
    await addEvent(user.uid, { ...data, date: selectedDate });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agenda</Text>
        <TouchableOpacity
          onPress={onSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out">
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar */}
      <Calendar
        testID="calendar"
        current={selectedDate}
        onDayPress={day => setSelectedDate(toDateString(day.dateString))}
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

        {loading ? (
          <ActivityIndicator
            style={styles.loader}
            color="#6366f1"
            accessibilityLabel="Loading events"
          />
        ) : dayEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>
              No events for {formatEmptyStateDate(selectedDate)}
            </Text>
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
        onPress={() => setModalVisible(true)}
        accessibilityLabel="Add new event"
        accessibilityRole="button">
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Add Event Modal */}
      <AddEventModal
        visible={modalVisible}
        date={selectedDate}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveEvent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  signOut: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
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
  loader: {
    marginTop: 48,
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
