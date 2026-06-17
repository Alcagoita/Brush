/**
 * TaskFormScreen — KAN-143 (create) / KAN-13 (edit)
 *
 * Full-screen task form. In create mode: POI-first, required POI + title before
 * "Add task" is enabled. In edit mode: pre-populated, same layout.
 *
 * POI sources are mutually exclusive:
 *   (a) Free-text POI type (e.g. "bakery", "florist") → becomes task.poi
 *   (b) 4-column quick-pick grid of built-in POI types
 * Choosing one clears the other.
 *
 * Layout: sticky top bar + scrollable body + sticky bottom CTA.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { categories as builtInCategories, radius, spacing } from '../theme/tokens';
import { addTask, updateTask, deleteTask, subscribeToCategories, addCategory } from '../services/firestore';
import { CalendarIcon, ClockIcon, CloseIcon, PoiIcon } from '../components/AppIcon';
import type { Category, PoiType, Task } from '../types';
import { POI_CATALOG } from '../types';
import { PLACE_TYPE_LABELS } from '../services/maps';
import { todayISO } from '../utils/date';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COPY } from '../constants/copy';
import { useToastStore } from '../store/toastStore';
import { evaluateAddTaskAchievement, evaluateCustomCatAchievement } from '../services/achievements';
import RotatingTitlePlaceholder from '../components/RotatingTitlePlaceholder';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskFormParams {
  uid: string;
  task?: Task;
  initialDate?: string;
  initialTitle?: string;
  initialPoi?: PoiType;
}

// ─── POI type suggestion catalog ──────────────────────────────────────────────

const ALL_TYPE_SUGGESTIONS = Object.entries(PLACE_TYPE_LABELS).map(
  ([type, label]) => ({ type, label }),
);

function getTypeSuggestions(q: string): { type: string; label: string }[] {
  if (!q.trim()) { return []; }
  // Split query into words; every query word must match the START of some label word.
  // "bus" → matches "Bus Station"; "b" → matches "Bank" but not "Library" or "Night Club".
  const queryWords = q.toLowerCase().replace(/_/g, ' ').trim().split(/\s+/);
  return ALL_TYPE_SUGGESTIONS
    .filter(s => {
      const labelWords = s.label.toLowerCase().split(/\s+/);
      return queryWords.every(qw => labelWords.some(lw => lw.startsWith(qw)));
    })
    .slice(0, 6);
}

const COLOR_DESTRUCTIVE = '#e05252';

// ─── Category hues for custom categories ─────────────────────────────────────

const NTD_CAT_HUES = [
  '#d4855a', // oklch(0.66 0.13 30)
  '#e8a86a', // oklch(0.66 0.13 70) — accent
  '#5ba87a', // oklch(0.62 0.12 130)
  '#5ba87a', // oklch(0.62 0.12 165)
  '#5b8fa4', // oklch(0.62 0.12 215)
  '#5b7fd4', // oklch(0.62 0.12 250)
  '#8b6bc4', // oklch(0.62 0.12 305)
  '#c45b7a', // oklch(0.62 0.12 350)
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PoiTileProps {
  type: PoiType;
  label: string;
  selected: boolean;
  onPress: () => void;
  palette: ReturnType<typeof useTheme>['palette'];
}

function PoiTile({ type, label, selected, onPress, palette }: PoiTileProps) {
  const iconColor = selected ? palette.nearText : palette.muted;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.poiTile,
        {
          backgroundColor: selected ? palette.nearTint2  : palette.surface,
          borderColor:     selected ? palette.nearBorder : palette.line,
        },
      ]}>
      <PoiIcon type={type} color={iconColor} size={22} />
      <Text style={[styles.poiTileLabel, { color: iconColor }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TaskFormScreen() {
  const { palette }  = useTheme();
  const navigation   = useNavigation();
  const insets       = useSafeAreaInsets();
  const route        = useRoute<RouteProp<RootStackParamList, 'TaskForm'>>();

  const { uid, task: existingTask, initialDate, initialTitle, initialPoi } = route.params;
  const isEdit = !!existingTask;

  // ── Form state ──────────────────────────────────────────────────────────────

  const [title,    setTitle]    = useState(existingTask?.title    ?? initialTitle ?? '');
  const [category, setCategory] = useState<string | null>(existingTask?.category ?? null);
  const [notes,    setNotes]    = useState(existingTask?.description ?? '');
  // Rotating title placeholder freezes permanently once the user taps the field (KAN-149).
  const [titleFocused, setTitleFocused] = useState(false);

  // Due date
  const [date, setDate] = useState<string>(() => {
    if (existingTask?.date) { return existingTask.date; }
    if (initialDate)        { return initialDate; }
    return todayISO();
  });

  // Time
  const [time, setTime] = useState<string>(existingTask?.time ?? '');

  // POI — two mutually exclusive sources
  const [poiKey,   setPoiKey]   = useState<PoiType | null>(
    (existingTask?.poi as PoiType | undefined) ?? initialPoi ?? null,
  );

  // Free-text POI type — mutually exclusive with poiKey.
  // query    = display text in the input (friendly label after a suggestion is picked)
  // customPoiType = resolved type key to save (e.g. "bus_station"); null while still typing
  const [query,         setQuery]         = useState('');
  const [customPoiType, setCustomPoiType] = useState<string | null>(null);
  const [focused,       setFocused]       = useState(false);

  // Custom categories
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  useEffect(() => {
    return subscribeToCategories(uid, cats => {
      setCustomCategories(cats.filter(c => !c.isBuiltIn));
    }, err => console.warn('[TaskFormScreen] categories error', err));
  }, [uid]);

  // Inline new-category editor
  const [addingCat,   setAddingCat]   = useState(false);
  const [newCatName,  setNewCatName]  = useState('');
  const [newCatColor, setNewCatColor] = useState(NTD_CAT_HUES[0]);
  const [newCatSaving, setNewCatSaving] = useState(false);

  const handleOpenNewCat = useCallback(() => {
    setNewCatName('');
    setNewCatColor(NTD_CAT_HUES[0]);
    setNewCatSaving(false);
    setAddingCat(true);
  }, []);

  const handleSaveNewCat = useCallback(async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) { return; }
    setNewCatSaving(true);
    try {
      const id = await addCategory(uid, { name: trimmed, color: newCatColor, poi: null });
      evaluateCustomCatAchievement(uid).catch(() => {});
      setCategory(id);
      setAddingCat(false);
    } catch (err) {
      console.warn('[TaskFormScreen] addCategory error', err);
    } finally {
      setNewCatSaving(false);
    }
  }, [uid, newCatName, newCatColor]);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef<TextInput>(null);

  // poi is required: quick-pick key → customPoiType (from suggestion) → raw query text
  const effectivePoi: string | null = poiKey ?? customPoiType ?? (query.trim() || null);

  // Suggestions shown while the user is actively typing (hidden once a suggestion is selected)
  const suggestions = !customPoiType && query.trim() ? getTypeSuggestions(query) : [];
  const canSubmit = title.trim().length > 0 && effectivePoi !== null;

  const handleSave = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || !effectivePoi) { return; }

    setSubmitting(true);
    try {
      const payload: Omit<Task, 'id' | 'createdAt' | 'completedAt'> = {
        title:    trimmed,
        category: category ?? 'personal',
        done:     existingTask?.done ?? false,
        poi:      effectivePoi,
        date,
        ...(time.trim() ? { time: time.trim() } : {}),
      };

      if (notes.trim()) {
        // notes stored as description for backwards compat with task model
        (payload as any).description = notes.trim();
      }

      if (isEdit && existingTask) {
        await updateTask(uid, existingTask.id, payload);
      } else {
        await addTask(uid, payload);
        evaluateAddTaskAchievement(uid).catch(() => {});
        useToastStore.getState().showToast(COPY.newTaskSheet.confirmToast);
      }
      navigation.goBack();
    } catch (err) {
      console.warn('[TaskFormScreen] save error', err);
    } finally {
      setSubmitting(false);
    }
  }, [title, category, effectivePoi, time, date, notes, uid, isEdit, existingTask, navigation]);

  // ── Delete (edit mode only) ─────────────────────────────────────────────────

  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(() => {
    if (!existingTask) { return; }
    Alert.alert(
      'Delete this task?',
      existingTask.title,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteTask(uid, existingTask.id);
              navigation.goBack();
            } catch (err) {
              console.warn('[TaskFormScreen] delete error', err);
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [uid, existingTask, navigation]);

  // ── Category list ───────────────────────────────────────────────────────────

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

      {/* ── Sticky top bar ── */}
      <View style={[
        styles.topBar,
        {
          paddingTop:        insets.top + 8,
          borderBottomColor: palette.line,
          backgroundColor:   palette.bg,
        },
      ]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backBtn}>
          <Text style={[styles.backLabel, { color: palette.muted }]}>‹</Text>
        </Pressable>
        <Text style={[styles.topBarTitle, { color: palette.text }]}>
          {isEdit ? 'Edit task' : COPY.newTaskSheet.title}
        </Text>
        <View style={styles.topBarRight} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ── Title — no section label (header + placeholder already ask it) ── */}
        <View style={styles.section}>
          <View style={styles.titleInputWrap}>
            <TextInput
              ref={titleRef}
              style={[
                styles.titleInput,
                {
                  backgroundColor: palette.surface,
                  borderColor:     palette.line,
                  color:           palette.text,
                },
              ]}
              value={title}
              onChangeText={setTitle}
              onFocus={() => setTitleFocused(true)}
              returnKeyType="next"
              maxLength={200}
              accessibilityLabel={isEdit ? 'Task title' : COPY.newTaskSheet.title}
            />
            {/* Rotating example placeholder — same component as the quick sheet (KAN-148) */}
            {!isEdit && !titleFocused && title.length === 0 && (
              <RotatingTitlePlaceholder
                examples={COPY.newTaskSheet.titleExamples}
                active={!titleFocused}
                style={[styles.titlePlaceholder, { color: palette.muted }]}
              />
            )}
          </View>
        </View>

        {/* ── Where does this happen? ── */}
        <View style={styles.section}>
          <View style={styles.questionRow}>
            <Text style={[styles.questionLabel, { color: palette.text }]}>
              {COPY.newTaskSheet.poiQuestion}
            </Text>
          </View>

          {/* Search field */}
          <View style={[
            styles.searchWrap,
            {
              backgroundColor: palette.surface,
              borderColor:     focused ? palette.nearBorder : palette.line,
            },
          ]}>
            <PoiIcon type="store" color={palette.faint} size={16} />
            <TextInput
              style={[styles.searchInput, { color: palette.text }]}
              placeholder={COPY.newTaskSheet.poiSearchPlaceholder}
              placeholderTextColor={palette.muted}
              value={query}
              onChangeText={v => {
                setQuery(v);
                setCustomPoiType(null); // user is typing freely again
                if (v) { setPoiKey(null); }
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              returnKeyType="done"
            />
            {!!query && (
              <Pressable
                onPress={() => { setQuery(''); setCustomPoiType(null); }}
                hitSlop={8}
                accessibilityLabel="Clear search">
                <CloseIcon color={palette.muted} size={16} />
              </Pressable>
            )}
          </View>

          {/* Type suggestions dropdown */}
          {suggestions.length > 0 && (
            <View style={[styles.dropdown, { backgroundColor: palette.bg, borderColor: palette.line }]}>
              {suggestions.map((s, i) => (
                <Pressable
                  key={s.type}
                  style={[
                    styles.dropdownRow,
                    i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: palette.line },
                  ]}
                  onPress={() => {
                    setQuery(s.label);
                    setCustomPoiType(s.type);
                    setPoiKey(null);
                  }}>
                  <PoiIcon type={s.type} color={palette.muted} size={18} />
                  <Text style={[styles.dropdownLabel, { color: palette.text }]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Quick-pick grid — 4 columns */}
          <View style={styles.poiGrid}>
            {POI_CATALOG.map(({ type, label }) => (
              <PoiTile
                key={type}
                type={type}
                label={label}
                selected={poiKey === type}
                onPress={() => {
                  const next = poiKey === type ? null : type;
                  setPoiKey(next);
                  if (next) { setQuery(''); setCustomPoiType(null); }
                }}
                palette={palette}
              />
            ))}
          </View>
        </View>

        {/* ── Which part of your life? (optional) ── */}
        <View style={styles.section}>
          <View style={styles.questionRow}>
            <Text style={[styles.questionLabel, { color: palette.text }]}>
              {COPY.newTaskSheet.catQuestion}
            </Text>
            <Text style={[styles.questionOptional, { color: palette.faint }]}>
              {COPY.newTaskSheet.catOptional}
            </Text>
          </View>
          <View style={styles.categoryRow}>
            {allCategories.map(cat => {
              const active = category === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(active ? null : cat.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: active ? cat.color + '22' : palette.surface,
                      borderColor:     active ? cat.color       : palette.line,
                    },
                  ]}>
                  <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.categoryLabel, { color: active ? cat.color : palette.text }]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}

            {/* ＋ New chip */}
            {!addingCat && (
              <Pressable
                onPress={handleOpenNewCat}
                accessibilityRole="button"
                accessibilityLabel="Create new category"
                style={[styles.newCatChip, { borderColor: palette.line, backgroundColor: palette.surface }]}>
                <Text style={[styles.newCatChipLabel, { color: palette.muted }]}>＋ New</Text>
              </Pressable>
            )}
          </View>

          {/* Inline category editor */}
          {addingCat && (
            <View style={[styles.catEditor, { backgroundColor: palette.surface, borderColor: palette.line }]}>
              <View style={styles.catEditorRow}>
                <View style={[styles.catColorPreview, { backgroundColor: newCatColor }]} />
                <TextInput
                  style={[styles.catNameInput, { color: palette.text }]}
                  placeholder="Category name"
                  placeholderTextColor={palette.faint}
                  value={newCatName}
                  onChangeText={setNewCatName}
                  autoFocus
                  maxLength={40}
                />
              </View>
              <View style={styles.swatchRow}>
                {NTD_CAT_HUES.map(c => (
                  <Pressable
                    key={c}
                    onPress={() => setNewCatColor(c)}
                    style={[
                      styles.swatch,
                      { backgroundColor: c },
                      newCatColor === c && styles.swatchSelected,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: newCatColor === c }}
                  />
                ))}
              </View>
              <View style={styles.catEditorActions}>
                <Pressable
                  onPress={() => setAddingCat(false)}
                  style={[styles.catActionBtn, { borderColor: palette.line }]}
                  accessibilityRole="button">
                  <Text style={[styles.catActionLabel, { color: palette.muted }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveNewCat}
                  disabled={!newCatName.trim() || newCatSaving}
                  style={[
                    styles.catActionBtn,
                    styles.catActionBtnPrimary,
                    { backgroundColor: newCatName.trim() ? palette.text : palette.surface2 },
                  ]}
                  accessibilityRole="button">
                  <Text style={[
                    styles.catActionLabel,
                    { color: newCatName.trim() ? palette.bg : palette.muted },
                  ]}>
                    {newCatSaving ? 'Saving…' : 'Add category'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* ── Around when? (optional) ── */}
        <View style={styles.section}>
          <View style={styles.questionRow}>
            <Text style={[styles.questionLabel, { color: palette.text }]}>
              {COPY.newTaskSheet.timeQuestion}
            </Text>
            <Text style={[styles.questionOptional, { color: palette.faint }]}>
              {COPY.newTaskSheet.timeOptional}
            </Text>
          </View>
          <View style={styles.scheduleRow}>
            {/* Date */}
            <View style={[styles.scheduleField, { backgroundColor: palette.surface, borderColor: palette.line }]}>
              <CalendarIcon color={palette.faint} size={16} />
              <TextInput
                style={[styles.scheduleInput, { color: palette.text, fontVariant: ['tabular-nums'] }]}
                placeholder={`Today · ${todayISO()}`}
                placeholderTextColor={palette.muted}
                value={date === todayISO() ? '' : date}
                onChangeText={setDate}
                maxLength={10}
              />
            </View>
            {/* Time */}
            <View style={[styles.scheduleField, { backgroundColor: palette.surface, borderColor: palette.line }]}>
              <ClockIcon color={palette.faint} size={16} />
              <TextInput
                style={[styles.scheduleInput, { color: palette.text, fontVariant: ['tabular-nums'] }]}
                placeholder={COPY.newTaskSheet.timePlaceholder}
                placeholderTextColor={palette.muted}
                value={time}
                onChangeText={setTime}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>
        </View>

        {/* ── NOTES section ── */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={[styles.sectionLabel, { color: palette.muted }]}>NOTES</Text>
            <Text style={[styles.sectionLabelOptional, { color: palette.faint }]}>
              {' '}(optional)
            </Text>
          </View>
          <TextInput
            style={[
              styles.notesInput,
              {
                backgroundColor: palette.surface,
                borderColor:     palette.line,
                color:           palette.text,
              },
            ]}
            placeholder="Add a note, link, or reminder…"
            placeholderTextColor={palette.muted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={2000}
          />
        </View>

        {/* ── Delete button (edit mode only) ── */}
        {isEdit && existingTask && (
          <Pressable
            onPress={handleDelete}
            disabled={deleting || submitting}
            style={({ pressed }) => [
              styles.deleteBtn,
              (deleting || pressed) && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Delete task">
            <Text style={[styles.deleteBtnLabel, { color: COLOR_DESTRUCTIVE }]}>
              {deleting ? 'Deleting…' : 'Delete task'}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* ── Sticky bottom CTA ── */}
      <View style={[
        styles.bottomCta,
        {
          borderTopColor:    palette.line,
          backgroundColor:   palette.bg,
          paddingBottom:     insets.bottom + 16,
        },
      ]}>
        <Text style={[styles.ctaHelper, { color: canSubmit ? palette.muted : palette.faint }]}>
          {isEdit
            ? (canSubmit ? 'Ready to save' : '')
            : (canSubmit ? 'Ready to add' : COPY.newTaskSheet.footerHint)}
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={!canSubmit || submitting}
          style={[
            styles.ctaBtn,
            {
              backgroundColor: canSubmit && !submitting
                ? palette.text
                : palette.surface2,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isEdit ? 'Save changes' : COPY.newTaskSheet.cta}
          accessibilityState={{ disabled: !canSubmit || submitting }}>
          <Text style={[
            styles.ctaBtnLabel,
            { color: canSubmit && !submitting ? palette.bg : palette.muted },
          ]}>
            {submitting
              ? (isEdit ? 'Saving…' : COPY.newTaskSheet.ctaSubmitting)
              : (isEdit ? 'Save changes' : COPY.newTaskSheet.cta)}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Top bar ──
  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.page,
    paddingBottom:     14,
    borderBottomWidth:  1,
  },
  backBtn: {
    width:  40,
    height: 40,
    alignItems:     'flex-start',
    justifyContent: 'center',
  },
  backLabel: {
    fontSize:   24,
    fontFamily: 'Geist-Regular',
    lineHeight: 28,
  },
  topBarTitle: {
    fontSize:   17,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  topBarRight: {
    width: 40,
  },

  // ── Scroll body ──
  scrollContent: {
    paddingHorizontal: spacing.page,
    paddingTop:        20,
    gap:               28,
  },

  // ── Sections ──
  section: {
    gap: 12,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems:    'baseline',
  },
  sectionLabel: {
    fontSize:      11,
    fontWeight:    '500',
    fontFamily:    'Geist-SemiBold',
    letterSpacing:  1.76,
  },
  sectionLabelOptional: {
    fontSize:   11,
    fontFamily: 'Geist-Regular',
  },
  // Sentence-case conversational question labels (KAN-149) — matches the
  // New Task quick sheet's style (KAN-148) so both screens read as the
  // same conversation continuing.
  questionRow: {
    flexDirection: 'row',
    alignItems:    'baseline',
  },
  questionLabel: {
    fontSize:      15,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
    letterSpacing: -0.15,
  },
  questionOptional: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },

  // ── Title input ──
  titleInputWrap: {
    position: 'relative',
  },
  titleInput: {
    fontSize:          16,
    fontFamily:        'Geist-Regular',
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderRadius:      12,
    borderWidth:        1,
  },
  // Overlays the TextInput at the same inset the native placeholder would
  // sit at — borderWidth(1) + padding(16/14), matching titleInput exactly.
  titlePlaceholder: {
    position: 'absolute',
    left:      17, // borderWidth(1) + paddingHorizontal(16)
    top:       15, // borderWidth(1) + paddingVertical(14)
    right:     17,
    fontSize:  16,
    fontFamily: 'Geist-Regular',
  },

  // ── Search field ──
  searchWrap: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               10,
    paddingHorizontal: 14,
    paddingVertical:   12,
    borderRadius:      12,
    borderWidth:        1,
  },
  searchInput: {
    flex:       1,
    fontSize:   15,
    fontFamily: 'Geist-Regular',
    padding:     0,
  },

  // ── Type suggestion dropdown ──
  dropdown: {
    borderRadius: 14,
    borderWidth:   1,
    overflow:     'hidden',
  },
  dropdownRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               10,
    paddingHorizontal: 14,
    paddingVertical:   11,
  },
  dropdownLabel: {
    flex:       1,
    fontSize:   14,
    fontFamily: 'Geist-Regular',
  },

  // ── POI grid (4 columns) ──
  poiGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           10,
  },
  poiTile: {
    width:          '22.5%',
    borderRadius:   14,
    borderWidth:     1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:             6,
    paddingTop:     12,
    paddingBottom:  10,
    paddingHorizontal: 4,
  },
  poiTileLabel: {
    fontSize:   11,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
  },

  // ── Category ──
  categoryRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:            8,
  },
  categoryPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:                6,
    paddingHorizontal: 12,
    paddingVertical:    8,
    borderRadius:      9999,
    borderWidth:        1,
  },
  categoryDot: {
    width:        7,
    height:       7,
    borderRadius: 4,
  },
  categoryLabel: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
  },
  newCatChip: {
    paddingHorizontal: 14,
    paddingVertical:    8,
    borderRadius:      9999,
    borderWidth:        1,
    borderStyle:       'dashed',
  },
  newCatChipLabel: {
    fontSize:   13,
    fontFamily: 'Geist-Medium',
    fontWeight: '500',
  },

  // ── Inline category editor ──
  catEditor: {
    borderRadius: 14,
    borderWidth:   1,
    padding:      16,
    gap:          14,
    marginTop:     4,
  },
  catEditorRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  catColorPreview: {
    width:        22,
    height:       22,
    borderRadius: 11,
    flexShrink:    0,
  },
  catNameInput: {
    flex:       1,
    fontSize:   15,
    fontFamily: 'Geist-Regular',
    padding:     0,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:            8,
  },
  swatch: {
    width:        26,
    height:       26,
    borderRadius: 13,
  },
  swatchSelected: {
    transform:   [{ scale: 1.2 }],
    borderWidth:  2,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  catEditorActions: {
    flexDirection: 'row',
    gap:           8,
  },
  catActionBtn: {
    flex:              1,
    borderWidth:        1,
    borderRadius:      radius.ctaBtn,
    paddingVertical:   11,
    alignItems:        'center',
  },
  catActionBtnPrimary: {
    borderWidth: 0,
  },
  catActionLabel: {
    fontSize:   14,
    fontFamily: 'Geist-Medium',
    fontWeight: '500',
  },

  // ── Schedule ──
  scheduleRow: {
    flexDirection: 'row',
    gap:           10,
  },
  scheduleField: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    gap:             8,
    paddingHorizontal: 12,
    paddingVertical:   12,
    borderRadius:   12,
    borderWidth:     1,
  },
  scheduleInput: {
    flex:       1,
    fontSize:   14,
    fontFamily: 'Geist-Regular',
    padding:     0,
  },

  // ── Notes ──
  notesInput: {
    fontSize:          15,
    fontFamily:        'Geist-Regular',
    lineHeight:        22.5,
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderRadius:      12,
    borderWidth:        1,
    minHeight:         88,
    maxHeight:         140,
  },

  // ── Delete button ──
  deleteBtn: {
    alignItems:     'center',
    paddingVertical: 20,
  },
  deleteBtnLabel: {
    fontSize:   16,
    fontFamily: 'Geist-Regular',
  },

  // ── Sticky bottom CTA ──
  bottomCta: {
    position:          'absolute',
    bottom:             0,
    left:               0,
    right:              0,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.page,
    paddingTop:        16,
    borderTopWidth:     1,
  },
  ctaHelper: {
    flex:       1,
    fontSize:   13,
    fontFamily: 'Geist-Regular',
    marginRight: 12,
  },
  ctaBtn: {
    paddingHorizontal: 24,
    paddingVertical:   14,
    borderRadius:      radius.ctaBtn,
    alignItems:        'center',
  },
  ctaBtnLabel: {
    fontSize:   15,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
});
