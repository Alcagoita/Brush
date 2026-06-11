/**
 * TaskFormScreen — KAN-143 (create) / KAN-13 (edit)
 *
 * Full-screen task form. In create mode: POI-first, required POI + title before
 * "Add task" is enabled. In edit mode: pre-populated, same layout.
 *
 * POI sources are mutually exclusive:
 *   (a) Google Maps text search → selected place card
 *   (b) 4-column quick-pick grid
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
import type { RootStackParamList } from '../navigation/AppNavigator';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskFormParams {
  uid: string;
  task?: Task;
  initialDate?: string;
  initialTitle?: string;
  initialPoi?: PoiType;
}

// ─── Mock Places data (replace with Google Places API in production) ──────────

interface PlaceSuggestion {
  name: string;
  type: string;
  address: string;
  distanceMeters: number;
  iconKey: string;
}

const NTD_PLACES: PlaceSuggestion[] = [
  { name: 'Pingo Doce',        type: 'supermarket', address: 'R. Augusta 12',       distanceMeters: 180, iconKey: 'supermarket' },
  { name: 'Continente',        type: 'supermarket', address: 'Av. República 45',    distanceMeters: 340, iconKey: 'supermarket' },
  { name: 'Delta Café',        type: 'cafe',        address: 'Praça do Comércio 3', distanceMeters: 220, iconKey: 'cafe'        },
  { name: 'Farmácia Saúde',    type: 'pharmacy',    address: 'R. do Ouro 78',       distanceMeters: 130, iconKey: 'pharmacy'    },
  { name: 'Banco de Portugal', type: 'bank',        address: 'R. Áurea 27',         distanceMeters: 260, iconKey: 'bank'        },
  { name: 'CTT Correios',      type: 'post',        address: 'R. do Arsenal 5',     distanceMeters: 410, iconKey: 'post'        },
];

function getFilteredPlaces(query: string): PlaceSuggestion[] {
  if (!query.trim()) { return []; }
  const q = query.toLowerCase();
  return NTD_PLACES
    .filter(p => p.name.toLowerCase().includes(q) || p.type.includes(q))
    .slice(0, 6);
}

function formatDist(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
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
  const [place,    setPlace]    = useState<PlaceSuggestion | null>(null);

  // Google Maps search
  const [query,     setQuery]    = useState('');
  const [focused,   setFocused]  = useState(false);
  const [results,   setResults]  = useState<PlaceSuggestion[]>([]);

  useEffect(() => {
    setResults(getFilteredPlaces(query));
  }, [query]);

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

  // poi is required: either a quick-pick key or a searched place
  const effectivePoi: string | null = poiKey ?? place?.type ?? null;
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
        time:     time.trim() || undefined,
        date,
      };

      if (notes.trim()) {
        // notes stored as description for backwards compat with task model
        (payload as any).description = notes.trim();
      }

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
          {isEdit ? 'Edit task' : 'New task'}
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

        {/* ── TASK section ── */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={[styles.sectionLabel, { color: palette.muted }]}>TASK</Text>
            <Text style={[styles.sectionLabelRequired, { color: palette.accent }]}>
              {' · '}required
            </Text>
          </View>
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
            placeholder="What do you need to do?"
            placeholderTextColor={palette.muted}
            value={title}
            onChangeText={setTitle}
            autoFocus={!isEdit}
            returnKeyType="next"
            maxLength={200}
          />
        </View>

        {/* ── POINT OF INTEREST section ── */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={[styles.sectionLabel, { color: palette.muted }]}>
              POINT OF INTEREST
            </Text>
            <Text style={[styles.sectionLabelRequired, { color: palette.accent }]}>
              {' · '}required
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
              placeholder="Search places on Google Maps…"
              placeholderTextColor={palette.muted}
              value={query}
              onChangeText={v => {
                setQuery(v);
                if (v) { setPoiKey(null); } // clear quick-pick
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              returnKeyType="search"
            />
            {!!query && (
              <Pressable
                onPress={() => { setQuery(''); setResults([]); setPlace(null); }}
                hitSlop={8}
                accessibilityLabel="Clear search">
                <CloseIcon color={palette.muted} size={16} />
              </Pressable>
            )}
          </View>

          {/* Search results dropdown */}
          {results.length > 0 && !place && (
            <View style={[
              styles.dropdown,
              { backgroundColor: palette.bg, borderColor: palette.line },
            ]}>
              {results.map((r, i) => (
                <Pressable
                  key={i}
                  style={[
                    styles.dropdownRow,
                    i < results.length - 1 && { borderBottomWidth: 1, borderBottomColor: palette.line },
                  ]}
                  onPress={() => {
                    setPlace(r);
                    setQuery('');
                    setResults([]);
                    setPoiKey(null);
                  }}>
                  <PoiIcon type={r.iconKey as PoiType} color={palette.muted} size={18} />
                  <View style={styles.dropdownText}>
                    <Text style={[styles.dropdownName, { color: palette.text }]} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={[styles.dropdownSub, { color: palette.muted }]} numberOfLines={1}>
                      {r.type} · {r.address}
                    </Text>
                  </View>
                  <Text style={[styles.dropdownDist, { color: palette.faint }]}>
                    {formatDist(r.distanceMeters)}
                  </Text>
                </Pressable>
              ))}
              {/* Google attribution — required by Google TOS */}
              <View style={styles.attribution}>
                <Text style={[styles.attributionLabel, { color: palette.faint }]}>
                  <Text style={{ fontWeight: '700' }}>Google</Text> Maps Places
                </Text>
              </View>
            </View>
          )}

          {/* Selected place card */}
          {place && (
            <View style={[
              styles.placeCard,
              { backgroundColor: palette.nearTint2, borderColor: palette.nearBorder },
            ]}>
              <PoiIcon type={place.iconKey as PoiType} color={palette.nearText} size={18} />
              <View style={styles.placeCardText}>
                <Text style={[styles.placeCardName, { color: palette.nearText }]} numberOfLines={1}>
                  {place.name}
                </Text>
                <Text style={[styles.placeCardSub, { color: palette.nearText }]} numberOfLines={1}>
                  {place.type} · {formatDist(place.distanceMeters)} away
                </Text>
              </View>
              <Pressable
                onPress={() => setPlace(null)}
                hitSlop={8}
                accessibilityLabel="Remove place">
                <CloseIcon color={palette.nearText} size={16} />
              </Pressable>
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
                  if (next) { setPlace(null); setQuery(''); setResults([]); }
                }}
                palette={palette}
              />
            ))}
          </View>
        </View>

        {/* ── CATEGORY section ── */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={[styles.sectionLabel, { color: palette.muted }]}>CATEGORY</Text>
            <Text style={[styles.sectionLabelOptional, { color: palette.faint }]}>
              {' '}(optional)
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

        {/* ── SCHEDULE section ── */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={[styles.sectionLabel, { color: palette.muted }]}>SCHEDULE</Text>
            <Text style={[styles.sectionLabelOptional, { color: palette.faint }]}>
              {' '}(optional)
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
                placeholder="e.g. 14:00"
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
          {canSubmit
            ? 'Ready to add'
            : 'Add a task name and a point of interest'}
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
          accessibilityLabel={isEdit ? 'Save changes' : 'Add task'}
          accessibilityState={{ disabled: !canSubmit || submitting }}>
          <Text style={[
            styles.ctaBtnLabel,
            { color: canSubmit && !submitting ? palette.bg : palette.muted },
          ]}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add task'}
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
  sectionLabelRequired: {
    fontSize:   11,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
  sectionLabelOptional: {
    fontSize:   11,
    fontFamily: 'Geist-Regular',
  },

  // ── Title input ──
  titleInput: {
    fontSize:          16,
    fontFamily:        'Geist-Regular',
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderRadius:      12,
    borderWidth:        1,
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

  // ── Dropdown ──
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
  dropdownText: {
    flex: 1,
    gap:   2,
  },
  dropdownName: {
    fontSize:   14,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  dropdownSub: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
  },
  dropdownDist: {
    fontSize:    12,
    fontFamily:  'Geist-Regular',
    fontVariant: ['tabular-nums'],
  },
  attribution: {
    alignItems:      'center',
    paddingVertical:  8,
  },
  attributionLabel: {
    fontSize:   10.5,
    fontFamily: 'Geist-Regular',
  },

  // ── Selected place card ──
  placeCard: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               10,
    paddingHorizontal: 14,
    paddingVertical:   12,
    borderRadius:      12,
    borderWidth:        1,
  },
  placeCardText: {
    flex: 1,
    gap:   2,
  },
  placeCardName: {
    fontSize:   14.5,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
  placeCardSub: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
    opacity:     0.8,
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
