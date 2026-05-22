import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Event } from '../types';

interface Props {
  event: Event;
}

export default function EventCard({ event }: Props) {
  return (
    <View style={styles.card}>
      <View style={[styles.colorBar, { backgroundColor: event.color }]} />
      <View style={styles.content}>
        <Text style={styles.title}>{event.title}</Text>
        {event.description ? (
          <Text style={styles.description}>{event.description}</Text>
        ) : null}
        <Text style={styles.time}>
          {event.startTime} — {event.endTime}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  colorBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
});
