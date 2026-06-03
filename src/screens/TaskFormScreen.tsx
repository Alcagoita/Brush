/**
 * TaskFormScreen — KAN-12 (create) / KAN-13 (edit)
 *
 * Full-screen modal for creating or editing a task.
 *
 * Fields:
 *   - Title (required, autofocus)
 *   - Description (optional, multi-line, 3 visible lines)
 *   - Due date (optional, native date picker, shown as "Mon 3 Jun" chip)
 *   - Category (pill picker — 4 built-ins + custom from Firestore)
 *   - POI (optional, 4-column grid)
 *   - Time (optional, native time picker, shown as "09:30" chip)
 *
 * Navigation params:
 *   - uid: string — always required
 *   - task?: Task — when present the form is pre-populated (edit mode)
 *   - initialDate?: string — YYYY-MM-DD; defaults to today (create mode)
 *   - customCategories?: Category[] — passed from caller to avoid a second subscription
 *
 * On save: calls addTask() (create) or updateTask() (edit), then navigates back.
 * The Firestore real-time subscription on the caller's screen picks up the change automatically.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { categories as builtInCategories, radius, spacing } from '../theme/tokens';
import { addTask, updateTask, subscribeToCategories } from '../services/firestore';
import { ClockIcon, PoiIcon } from '../components/AppIcon';
import type { Category, PoiType, Task } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskFormParams {
  uid: string;
  /** Present → edit mode; absent → create mode. */
  task?: Task;
  /** Initial date for the due-date field (YYYY-MM-DD). Defaults to today. */
  initialDate?: string;
}

const POI_OPTIONS: { type: PoiType; label: string }[] = [
  { type: 'atm',         label: 'ATM'      },
  { type: 'cafe',        label: 'Café'     },
  { type: 'supermarket', label: 'Market'   },
  { type: 'pharmacy',    label: 'Pharmacy' },
];

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Format a Date as "Mon 3 Jun". */
function formatDueDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Format a Date as "HH:MM". */
function formatTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Parse a "HH:MM" string back into today's Date at that time. */
function parseTime(s: string): Date {
  const [hh, mm] = s.split(':').map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}

/** Parse a "YYYY-MM-DD" string into a local Date (noon, avoids DST midnight issues). */
function parseDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <Text style={[styles.sectionLabel, { color }]}>{label}</Text>
  );
}

// ─── Chip (date / time display pill) ─────────────────────────────────────────

interface ChipProps {
  label: string;
  onPress: () => void;
  onClear: () => void;
  accentColor: string;
  lineColor: string;
  bgColor: string;
  textColor: string;
}

function Chip({ label, onPress, onClear, accentColor, lineColor, bgColor, textColor }: ChipProps) {
  return (
    <View style={styles.chipRow}>
      <Pressable
        onPress={onPress}
        style={[styles.chip, { backgroundColor: bgColor, borderColor: lineColor }]}>
        <Text style={[styles.chipLabel, { color: textColor }]}>{label}</Text>
      </Pressable>
      <Pressable
        onPress={onClear}
        hitSlop={8}
        style={[styles.chipClear, { borderColor: lineColor }]}
        accessibilityLabel={`Clear ${label}`}>
        <Text style={[styles.chipClearLabel, { color: accentColor }]}>✕</Text>
      </Pressable>
    </View>
  );
}

// ─── Category pill ────────────────────────────────────────────────────────────

interface CategoryPillProps {
  id: string;
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
  lineColor: string;
  bgColor: string;
}

function CategoryPill({ id, label, color, selected, onPress, lineColor, bgColor }: CategoryPillProps) {
  return (
    <Pressable
      key={id}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.pill,
        {
          backgroundColor: selected ? color + '22' : bgColor,
          borderColor:     selected ? color       : lineColor,
        },
      ]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

// ─── POI tile ─────────────────────────────────────────────────────────────────

interface PoiTileProps {
  type: PoiType;
  label: string;
  selected: boolean;
  onPress: () => void;
  palette: ReturnType<typeof useTheme>['palette'];
}

function PoiTile({ type, label, selected, onPress, palette }: PoiTileProps) {
  const accent = palette.accent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.poiTile,
        {
          backgroundColor: selected ? accent + '18' : palette.surface,
          borderColor:     selected ? accent        : palette.line,
        },
      ]}>
      <View style={[
        styles.poiIconWrap,
        { backgroundColor: selected ? accent + '28' : palette.surface2 },
      ]}>
        <PoiIcon type={type} color={selected ? accent : palette.muted} size={18} />
      </View>
      <Text style={[styles.poiLabel, { color: selected ? palette.text : palette.muted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TaskFormScreen() {
  const { palette } = useTheme();
  const navigation  = useNavigation();
  const insets      = useSafeAreaInsets();
  const route       = useRoute<RouteProp<RootStackParamList, 'TaskForm'>>();

  const { uid, task: existingTask, initialDate } = route.params;
  const isEdit = !!existingTask;

  // ── Form state ──────────────────────────────────────────────────────────────

  const [title,       setTitle]       = useState(existingTask?.title       ?? '');
  const [description, setDescription] = useState(existingTask?.description ?? '');
  const [category,    setCategory]    = useState<string>(existingTask?.category ?? 'personal');
  const [poi,         setPoi]         = useState<PoiType | null>(
    (existingTask?.poi as PoiType | undefined) ?? null,
  );

  // Due date
  const [dueDate,     setDueDate]     = useState<Date | null>(() => {
    const src = existingTask?.date ?? initialDate;
    if (src) { return parseDateString(src); }
    return null;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Time
  const [time,        setTime]        = useState<string | null>(existingTask?.time ?? null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerDate, setTimePickerDate] = useState<Date>(() => {
    if (existingTask?.time) { return parseTime(existingTask.time); }
    const d = new Date(); d.setSeconds(0, 0); return d;
  });

  // Custom categories from Firestore
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  useEffect(() => {
    return subscribeToCategories(uid, cats => {
      setCustomCategories(cats.filter(c => !c.isBuiltIn));
    }, err => console.warn('[TaskFormScreen] categories error', err));
  }, [uid]);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState('');
  const titleRef = useRef<TextInput>(null);

  const handleSave = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError('Title is required.');
      titleRef.current?.focus();
      return;
    }
    setTitleError('');
    setSubmitting(true);
    try {
      const dateStr = dueDate
        ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`
        : (initialDate ?? todayISO());

      const payload: Omit<Task, 'id' | 'createdAt' | 'completedAt'> = {
        title:       trimmed,
        description: description.trim() || undefined,
        category,
        done:        existingTask?.done ?? false,
        poi:         poi ?? undefined,
        time:        time ?? undefined,
        date:        dateStr,
      };

      if (isEdit && existingTask) {
        await updateTask(uid, existingTask.id, payload);
      } else {
        await addTask(uid, payload);
      }
      navigation.goBack();
    } catch (err) {
      console.warn('[TaskFormScreen] save error', err);
    } finally {
      setSubmitting(false);
    }
  }, [title, description, category, poi, time, dueDate, uid, isEdit, existingTask, initialDate, navigation]);

  // ── Category list (built-ins + custom) ─────────────────────────────────────

  const allCategories: { id: string; label: string; color: string }[] = [
    ...Object.entries(builtInCategories).map(([key, val]) => ({
      id: key, label: val.label, color: val.color,
    })),
    ...customCategories.map(c => ({ id: c.id, label: c.name, color: c.color })),
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: palette.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* ── Navigation bar ── */}
      <View style={[
        styles.navBar,
        {
          paddingTop:      insets.top + 8,
          borderBottomColor: palette.line,
          backgroundColor:   palette.bg,
        },
      ]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Cancel">
          <Text style={[styles.navCancel, { color: palette.muted }]}>Cancel</Text>
        </Pressable>

        <Text style={[styles.navTitle, { color: palette.text }]}>
          {isEdit ? 'Edit task' : 'New task'}
        </Text>

        <Pressable
          onPress={handleSave}
          disabled={submitting}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={isEdit ? 'Save changes' : 'Add task'}>
          <Text style={[
            styles.navSave,
            { color: submitting ? palette.faint : palette.accent },
          ]}>
            {isEdit ? 'Save' : 'Add'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ── Title ── */}
        <TextInput
          ref={titleRef}
          style={[styles.titleInput, { color: palette.text, borderBottomColor: palette.line }]}
          placeholder="Task title"
          placeholderTextColor={palette.faint}
          value={title}
          onChangeText={v => { setTitle(v); if (titleError) { setTitleError(''); } }}
          autoFocus={!isEdit}
          returnKeyType="next"
          accessibilityLabel="Title"
          maxLength={200}
        />
        {titleError ? (
          <Text style={styles.titleError}>{titleError}</Text>
        ) : null}

        {/* ── Description ── */}
        <TextInput
          style={[styles.descInput, { color: palette.text }]}
          placeholder="Add a description…"
          placeholderTextColor={palette.faint}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          accessibilityLabel="Description"
          maxLength={1000}
        />

        <View style={[styles.divider, { backgroundColor: palette.line }]} />

        {/* ── Due date ── */}
        <View style={styles.section}>
          <SectionLabel label="DUE DATE" color={palette.muted} />
          {dueDate ? (
            <Chip
              label={formatDueDate(dueDate)}
              onPress={() => setShowDatePicker(true)}
              onClear={() => setDueDate(null)}
              accentColor={palette.accent}
              lineColor={palette.line}
              bgColor={palette.surface}
              textColor={palette.text}
            />
          ) : (
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[styles.addChipBtn, { borderColor: palette.line }]}
              accessibilityLabel="Set due date">
              <Text style={[styles.addChipLabel, { color: palette.muted }]}>Set date</Text>
            </Pressable>
          )}
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={dueDate ?? new Date()}
            mode="date"
            minimumDate={new Date()}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, selected) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selected) { setDueDate(selected); }
            }}
          />
        )}

        <View style={[styles.divider, { backgroundColor: palette.line }]} />

        {/* ── Time ── */}
        <View style={styles.section}>
          <SectionLabel label="TIME" color={palette.muted} />
          {time ? (
            <Chip
              label={time}
              onPress={() => setShowTimePicker(true)}
              onClear={() => setTime(null)}
              accentColor={palette.accent}
              lineColor={palette.line}
              bgColor={palette.surface}
              textColor={palette.text}
            />
          ) : (
            <Pressable
              onPress={() => setShowTimePicker(true)}
              style={[styles.addChipBtn, { borderColor: palette.line }]}
              accessibilityLabel="Set time">
              <ClockIcon size={14} color={palette.muted} />
              <Text style={[styles.addChipLabel, { color: palette.muted }]}>Set time</Text>
            </Pressable>
          )}
        </View>

        {showTimePicker && (
          <DateTimePicker
            value={timePickerDate}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, selected) => {
              setShowTimePicker(Platform.OS === 'ios');
              if (selected) {
                setTimePickerDate(selected);
                setTime(formatTime(selected));
              }
            }}
          />
        )}

        <View style={[styles.divider, { backgroundColor: palette.line }]} />

        {/* ── Category ── */}
        <View style={styles.section}>
          <SectionLabel label="CATEGORY" color={palette.muted} />
          <View style={styles.pillWrap}>
            {allCategories.map(cat => (
              <CategoryPill
                key={cat.id}
                id={cat.id}
                label={cat.label}
                color={cat.color}
                selected={category === cat.id}
                onPress={() => setCategory(cat.id)}
                lineColor={palette.line}
                bgColor={palette.surface}
              />
            ))}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: palette.line }]} />

        {/* ── POI ── */}
        <View style={styles.section}>
          <SectionLabel label="NEARBY PLACE" color={palette.muted} />
          <View style={styles.poiGrid}>
            {POI_OPTIONS.map(opt => (
              <PoiTile
                key={opt.type}
                type={opt.type}
                label={opt.label}
                selected={poi === opt.type}
                onPress={() => setPoi(prev => prev === opt.type ? null : opt.type)}
                palette={palette}
              />
            ))}
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Nav bar ──
  navBar: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: spacing.page,
    paddingBottom:   14,
    borderBottomWidth: 1,
  },
  navCancel: {
    fontSize:   16,
    fontFamily: 'Geist-Regular',
  },
  navTitle: {
    fontSize:   16,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
  navSave: {
    fontSize:   16,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },

  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: spacing.page,
    paddingTop:        4,
  },

  // ── Title ──
  titleInput: {
    fontSize:       22,
    fontWeight:     '500',
    fontFamily:     'Geist-Medium',
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  titleError: {
    marginTop:  4,
    fontSize:   12,
    fontFamily: 'Geist-Regular',
    color:      '#e05252',
  },

  // ── Description ──
  descInput: {
    fontSize:        15,
    fontFamily:      'Geist-Regular',
    lineHeight:      22,
    paddingTop:      14,
    paddingBottom:   14,
    minHeight:       80,   // ~3 lines
    maxHeight:       80,
  },

  // ── Divider ──
  divider: {
    height: 1,
    marginVertical: 4,
  },

  // ── Sections ──
  section: {
    paddingVertical: 16,
    gap:             10,
  },
  sectionLabel: {
    fontSize:      11,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
    letterSpacing:  0.6,
  },

  // ── Date / time chip ──
  chipRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:            8,
  },
  chip: {
    borderRadius:      radius.chip,
    borderWidth:       1,
    paddingHorizontal: 14,
    paddingVertical:   8,
  },
  chipLabel: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
    fontVariant: ['tabular-nums'],
  },
  chipClear: {
    width:          26,
    height:         26,
    borderRadius:   13,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  chipClearLabel: {
    fontSize:   11,
    lineHeight: 14,
  },
  addChipBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    alignSelf:         'flex-start',
    borderRadius:      radius.chip,
    borderWidth:       1,
    paddingHorizontal: 14,
    paddingVertical:   8,
  },
  addChipLabel: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
  },

  // ── Category pills ──
  pillWrap: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
  },
  pill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    borderRadius:      radius.chip,
    borderWidth:       1,
    paddingHorizontal: 14,
    paddingVertical:   8,
  },
  pillDot: {
    width:        7,
    height:       7,
    borderRadius: 4,
  },
  pillLabel: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
  },

  // ── POI grid ──
  poiGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           10,
  },
  poiTile: {
    width:          '22%',
    aspectRatio:    1,
    borderRadius:   radius.card,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
  },
  poiIconWrap: {
    width:          36,
    height:         36,
    borderRadius:   radius.listIcon,
    alignItems:     'center',
    justifyContent: 'center',
  },
  poiLabel: {
    fontSize:   11,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
  },
});
