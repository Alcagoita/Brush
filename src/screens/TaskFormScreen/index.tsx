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
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { categories as builtInCategories, categoryHues } from '../../theme/tokens';
import { getScreenKeyboardAvoidingBehavior } from '../../utils/keyboardAvoiding';
import { addTask, updateTask, deleteTask, getCategories, addCategory } from '../../services/firestore';
import { learnFromUserEdit } from '../../services/poiLlm';
import { CalendarIcon, ClockIcon, CloseIcon, PoiIcon } from '../../components/AppIcon';
import type { Category, PoiType, Task } from '../../types';
import { logTap } from '../../services/analytics';
import { POI_CATALOG, poiCatalogLabel } from '../../types';
import { todayISO } from '../../utils/date';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { COPY } from '../../constants/copy';
import { useToastStore } from '../../store/toastStore';
import { evaluateAddTaskAchievement, evaluateCustomCatAchievement } from '../../services/achievements';
import RotatingTitlePlaceholder from '../../components/RotatingTitlePlaceholder';
import { getTypeSuggestions } from './poiSuggestions';
import { PoiTile } from './PoiTile';
import { styles, getPoiTileWidth } from './styles';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskFormParams {
  uid: string;
  task?: Task;
  initialDate?: string;
  initialTitle?: string;
  initialPoi?: PoiType;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TaskFormScreen() {
  const { palette }  = useTheme();
  const navigation   = useNavigation();
  const insets       = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const poiTileWidth = getPoiTileWidth(windowWidth);
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

  // Custom categories — one-shot fetch on mount (KAN-218). handleSaveNewCat
  // appends the newly created category locally rather than refetching.
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  useEffect(() => {
    getCategories(uid)
      .then(cats => setCustomCategories(cats.filter(c => !c.isBuiltIn)))
      .catch(err => console.warn('[TaskFormScreen] categories error', err));
  }, [uid]);

  // Inline new-category editor
  const [addingCat,   setAddingCat]   = useState(false);
  const [newCatName,  setNewCatName]  = useState('');
  const [newCatColor, setNewCatColor] = useState<string>(categoryHues[0]);
  const [newCatSaving, setNewCatSaving] = useState(false);

  const handleOpenNewCat = useCallback(() => {
    setNewCatName('');
    setNewCatColor(categoryHues[0]);
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
      // No live listener anymore (KAN-218) — append locally instead of refetching.
      setCustomCategories(prev => [...prev, { id, name: trimmed, color: newCatColor, poi: null, isBuiltIn: false }]);
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
        logTap('task_edit', { category: payload.category });
      } else {
        await addTask(uid, payload);
        logTap('task_create', { category: payload.category });
        evaluateAddTaskAchievement(uid).catch(() => {});
        useToastStore.getState().showToast(COPY.newTaskSheet.confirmToast);
      }

      // Feed the user's title→POI choice back into the inference dictionary
      // (KAN-197) so future imports recognise it. The user is the source of
      // truth. Best-effort and non-blocking — never affects the save.
      if (effectivePoi) {
        learnFromUserEdit(uid, trimmed, effectivePoi, 'en').catch(() => {});
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
      COPY.taskFormScreen.deleteConfirmTitle,
      existingTask.title,
      [
        { text: COPY.taskFormScreen.cancel, style: 'cancel' },
        {
          text: COPY.taskFormScreen.delete,
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteTask(uid, existingTask.id);
              logTap('task_delete', { category: existingTask.category });
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
      behavior={getScreenKeyboardAvoidingBehavior()}>

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
          accessibilityLabel={COPY.taskFormScreen.goBackA11y}
          style={styles.backBtn}>
          <Text style={[styles.backLabel, { color: palette.muted }]}>‹</Text>
        </Pressable>
        <Text style={[styles.topBarTitle, { color: palette.text }]}>
          {isEdit ? COPY.taskFormScreen.editTaskTitle : COPY.newTaskSheet.title}
        </Text>
        <View style={styles.topBarRight} />
      </View>

      <ScrollView
        style={[styles.scrollView, { backgroundColor: palette.bg }]}
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
              accessibilityLabel={isEdit ? COPY.taskFormScreen.taskTitleA11y : COPY.newTaskSheet.title}
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
                accessibilityLabel={COPY.taskFormScreen.clearSearchA11y}>
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
            {POI_CATALOG.map(({ type }) => (
              <PoiTile
                key={type}
                type={type}
                label={poiCatalogLabel(type)}
                selected={poiKey === type}
                onPress={() => {
                  const next = poiKey === type ? null : type;
                  setPoiKey(next);
                  if (next) {
                    setQuery('');
                    setCustomPoiType(null);
                    logTap('poi_chip_tap', { poi_type: type });
                  }
                }}
                palette={palette}
                width={poiTileWidth}
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
                accessibilityLabel={COPY.taskFormScreen.createNewCategoryA11y}
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
                  placeholder={COPY.taskFormScreen.categoryNamePlaceholder}
                  placeholderTextColor={palette.faint}
                  value={newCatName}
                  onChangeText={setNewCatName}
                  autoFocus
                  maxLength={40}
                />
              </View>
              <View style={styles.swatchRow}>
                {categoryHues.map(c => (
                  <Pressable
                    key={c}
                    onPress={() => setNewCatColor(c)}
                    style={[
                      styles.swatch,
                      { backgroundColor: c },
                      newCatColor === c && [styles.swatchSelected, { borderColor: palette.text }],
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
                  <Text style={[styles.catActionLabel, { color: palette.muted }]}>{COPY.taskFormScreen.cancel}</Text>
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
            placeholder={COPY.taskFormScreen.notesPlaceholder}
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
            accessibilityLabel={COPY.taskFormScreen.deleteTaskA11y}>
            <Text style={[styles.deleteBtnLabel, { color: palette.danger }]}>
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
