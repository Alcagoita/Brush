import React, { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateString } from '../types';

const EVENT_COLORS = [
  '#6366f1',
  '#0f9b8e',
  '#f59e0b',
  '#e94560',
  '#10b981',
  '#8b5cf6',
];

export interface NewEventData {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  color: string;
}

interface Props {
  visible: boolean;
  date: DateString;
  onClose: () => void;
  onSave: (event: NewEventData) => Promise<void>;
}

export default function AddEventModal({ visible, date, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setStartTime('09:00');
    setEndTime('10:00');
    setColor(EVENT_COLORS[0]);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter an event title.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        startTime,
        endTime,
        color,
      });
      reset();
      onClose();
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel">
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Event</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Save event">
            <Text style={[styles.save, saving && styles.saveDisabled]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.dateLabel}>{date}</Text>

          <TextInput
            style={styles.titleInput}
            placeholder="Event title"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
            accessibilityLabel="Event title"
          />

          <TextInput
            style={styles.descriptionInput}
            placeholder="Description (optional)"
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={setDescription}
            multiline
            accessibilityLabel="Event description"
          />

          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>Start</Text>
              <TextInput
                style={styles.timeInput}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="HH:MM"
                placeholderTextColor="#9ca3af"
                keyboardType="numbers-and-punctuation"
                accessibilityLabel="Start time"
              />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>End</Text>
              <TextInput
                style={styles.timeInput}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="HH:MM"
                placeholderTextColor="#9ca3af"
                keyboardType="numbers-and-punctuation"
                accessibilityLabel="End time"
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Color</Text>
          <View style={styles.colorRow}>
            {EVENT_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  color === c && styles.colorDotSelected,
                ]}
                onPress={() => setColor(c)}
                accessibilityRole="button"
                accessibilityLabel={`Select color ${c}`}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
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
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  cancel: {
    fontSize: 16,
    color: '#6366f1',
  },
  save: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '700',
  },
  saveDisabled: {
    opacity: 0.4,
  },
  form: {
    paddingHorizontal: 20,
  },
  dateLabel: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 16,
  },
  titleInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a2e',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  descriptionInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1a1a2e',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  timeField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
  },
  timeInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#1a1a2e',
  },
});
