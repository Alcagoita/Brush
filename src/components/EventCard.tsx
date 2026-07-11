import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { Event } from '../types';

interface Props {
  event: Event;
}

export default function EventCard({ event }: Props) {
  const { palette } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.line }]}>
      <View style={[styles.colorBar, { backgroundColor: event.color }]} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: palette.text }]}>{event.title}</Text>
        {event.description ? (
          <Text style={[styles.description, { color: palette.muted }]}>{event.description}</Text>
        ) : null}
        <Text style={[styles.time, { color: palette.faint }]}>
          {event.startTime} — {event.endTime}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
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
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
  },
});
