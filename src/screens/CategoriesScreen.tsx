/**
 * CategoriesScreen — KAN-16
 *
 * Layout (top → bottom):
 *   1. Top bar      — back button + "Categories" title
 *   2. Category list
 *      BUILT-IN section  — 4 design-system rows (read-only)
 *      CUSTOM section    — user-created rows with edit (×) delete actions
 *   3. "Add category" button (bottom of custom section)
 *   4. Add/Edit bottom sheet (Modal)
 *      - Name text input
 *      - Color picker (18 swatches + hex input)
 *      - POI picker   (4 quick-pick chips + Google Places search)
 *      - Save / Cancel
 *
 * Rules:
 *   - Built-in categories cannot be renamed, recoloured, or deleted.
 *   - Custom categories are stored in /users/{uid}/categories/{id}.
 *   - All colours via useTheme() — no hardcoded values.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import '@react-native-firebase/auth';
import { useTheme } from '../theme';
import { spacing, radius, categories as builtInMeta } from '../theme/tokens';
import {
  placeTypeLabel,
  PlaceTypeSuggestion,
} from '../services/maps';
import { searchPlaceTypesCached } from '../services/poiTypeCache';
import { Category } from '../types';
import { ChevronLeftIcon } from '../components/AppIcon';
import { useCategoriesScreen } from '../hooks/useCategoriesScreen';
import { COPY } from '../constants/copy';

// ─── Constants ────────────────────────────────────────────────────────────────

const ERROR_COLOR = '#e05252';

/**
 * 18 preset colours arranged in 3 rows of 6.
 * The 4 original design-system colours are kept at their legacy positions.
 */
export const CATEGORY_COLORS = [
  // Row 1 — blues & purples
  '#5b7fd4', // Work — soft blue (legacy)
  '#4f9ee8', // sky blue
  '#3b78e8', // bright blue
  '#8b6bc4', // Errands — muted purple (legacy)
  '#a06ed4', // lavender
  '#c47aa0', // mauve
  // Row 2 — greens, yellows, warm
  '#5ba87a', // Health — sage (legacy)
  '#3da890', // teal
  '#4dc880', // mint
  '#8ab84a', // olive
  '#d4c84a', // yellow
  '#e8a86a', // Personal — peach (legacy)
  // Row 3 — warm spectrum + neutrals
  '#e87a4a', // orange
  '#e05252', // red
  '#e05294', // hot pink
  '#c45294', // magenta
  '#8a9ab4', // slate
  '#7a7a7a', // gray
] as const;

/**
 * Quick-pick POI types shown as chips at the top of the location picker, and
 * the built-in categories derived from design tokens (never stored in
 * Firestore) — both built by functions called inside the component instead
 * of a module-scope constant, since COPY/`categories` are language-dynamic
 * (KAN-252) and a module-scope read would freeze the text in whatever
 * language was active on first import.
 */
function buildQuickPoiOptions(): { value: string; label: string }[] {
  return [
    { value: 'atm',         label: COPY.categoriesScreen.quickPickAtm },
    { value: 'cafe',        label: COPY.categoriesScreen.quickPickCafe },
    { value: 'supermarket', label: COPY.categoriesScreen.quickPickSupermarket },
    { value: 'pharmacy',    label: COPY.categoriesScreen.quickPickPharmacy },
  ];
}

function buildBuiltInCategories(): Category[] {
  return [
    { id: 'work',     name: builtInMeta.work.label,     color: builtInMeta.work.color,     poi: null,          isBuiltIn: true },
    { id: 'health',   name: builtInMeta.health.label,    color: builtInMeta.health.color,   poi: 'pharmacy',    isBuiltIn: true },
    { id: 'errands',  name: builtInMeta.errands.label,   color: builtInMeta.errands.color,  poi: 'supermarket', isBuiltIn: true },
    { id: 'personal', name: builtInMeta.personal.label,  color: builtInMeta.personal.color, poi: 'cafe',        isBuiltIn: true },
  ];
}

// ─── CategoryRow ──────────────────────────────────────────────────────────────

interface CategoryRowProps {
  category: Category;
  onEdit:   (cat: Category) => void;
  onDelete: (cat: Category) => void;
}

function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
  const { palette } = useTheme();

  return (
    <View
      style={[styles.row, { borderBottomColor: palette.line }]}
      accessibilityLabel={COPY.categoriesScreen.rowA11y(category.name)}>
      {/* Colour dot */}
      <View style={[styles.colorDot, { backgroundColor: category.color }]} />

      {/* Name + POI badge */}
      <View style={styles.rowContent}>
        <Text style={[styles.rowName, { color: palette.text }]}>{category.name}</Text>
        {category.poi !== null && (
          <View style={[styles.poiBadge, { backgroundColor: palette.surface2, borderColor: palette.line }]}>
            <Text style={[styles.poiBadgeText, { color: palette.muted }]}>
              {placeTypeLabel(category.poi)}
            </Text>
          </View>
        )}
      </View>

      {/* Edit + × delete — custom categories only */}
      {!category.isBuiltIn && (
        <View style={styles.rowActions}>
          <Pressable
            onPress={() => onEdit(category)}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel={COPY.categoriesScreen.editA11y(category.name)}>
            <Text style={[styles.actionLabel, { color: palette.muted }]}>{COPY.categoriesScreen.editButton}</Text>
          </Pressable>
          <Pressable
            onPress={() => onDelete(category)}
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel={COPY.categoriesScreen.deleteA11y(category.name)}>
            <Text style={styles.deleteX}>×</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Add / Edit sheet ─────────────────────────────────────────────────────────

interface SheetProps {
  visible:  boolean;
  initial:  Partial<Category> | null; // null = add mode
  onSave:   (data: Omit<Category, 'id' | 'isBuiltIn'>) => void;
  onCancel: () => void;
}

function CategorySheet({ visible, initial, onSave, onCancel }: SheetProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const quickPoiOptions = buildQuickPoiOptions();

  const [name,         setName]         = useState('');
  const [color,        setColor]        = useState<string>(CATEGORY_COLORS[0]);
  const [hexInput,     setHexInput]     = useState<string>(CATEGORY_COLORS[0]);
  const [poi,          setPoi]          = useState<string | null>(null);
  const [poiQuery,     setPoiQuery]     = useState('');
  const [poiResults,   setPoiResults]   = useState<PlaceTypeSuggestion[]>([]);
  const [poiSearching, setPoiSearching] = useState(false);
  const [nameErr,      setNameErr]      = useState('');

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Populate form when opening
  useEffect(() => {
    if (visible) {
      const initColor = initial?.color ?? CATEGORY_COLORS[0];
      setName(initial?.name  ?? '');
      setColor(initColor);
      setHexInput(initColor);
      setPoi(initial?.poi   ?? null);
      setPoiQuery('');
      setPoiResults([]);
      setPoiSearching(false);
      setNameErr('');
    }
  }, [visible, initial]);

  // Cleanup debounce timer on unmount
  useEffect(() => () => {
    if (searchTimer.current) { clearTimeout(searchTimer.current); }
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSwatchPress = (c: string) => {
    setColor(c);
    setHexInput(c);
  };

  const handleHexChange = (text: string) => {
    const normalized = text.startsWith('#') ? text : '#' + text;
    setHexInput(normalized);
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      setColor(normalized);
    }
  };

  const hexValid = /^#[0-9a-fA-F]{6}$/.test(hexInput);

  const handlePoiSearch = (text: string) => {
    const trimmed = text.trim();
    setPoiQuery(text);
    if (searchTimer.current) { clearTimeout(searchTimer.current); }
    if (!trimmed) {
      setPoiResults([]);
      setPoiSearching(false);
      return;
    }
    setPoiSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchPlaceTypesCached(trimmed);
        setPoiResults(results);
      } catch {
        setPoiResults([]);
      } finally {
        setPoiSearching(false);
      }
    }, 350);
  };

  const handlePoiSelect = (type: string | null) => {
    setPoi(type);
    setPoiQuery('');
    setPoiResults([]);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameErr(COPY.categoriesScreen.nameRequiredError); return; }
    onSave({ name: trimmed, color, poi });
  };

  const isAdd = initial === null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onCancel}>
      <Pressable style={styles.scrim} onPress={onCancel} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetOuter}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: palette.surface,
              paddingBottom:   insets.bottom + 16,
            },
          ]}>

          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: palette.faint }]} />

          <Text style={[styles.sheetTitle, { color: palette.text }]}>
            {isAdd ? COPY.categoriesScreen.sheetTitleNew : COPY.categoriesScreen.sheetTitleEdit}
          </Text>

          {/* ── Name ── */}
          <Text style={[styles.fieldLabel, { color: palette.muted }]}>{COPY.categoriesScreen.nameFieldLabel}</Text>
          <View style={[
            styles.nameInputWrap,
            { backgroundColor: palette.surface2, borderColor: nameErr ? ERROR_COLOR : palette.line },
          ]}>
            <TextInput
              style={[styles.nameInput, { color: palette.text }]}
              placeholder={COPY.categoriesScreen.namePlaceholder}
              placeholderTextColor={palette.faint}
              value={name}
              onChangeText={v => { setName(v); if (nameErr) { setNameErr(''); } }}
              autoFocus={visible}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              accessibilityLabel={COPY.categoriesScreen.nameA11y}
            />
          </View>
          {nameErr ? <Text style={styles.nameErr}>{nameErr}</Text> : null}

          {/* ── Colour ── */}
          <Text style={[styles.fieldLabel, { color: palette.muted }]}>{COPY.categoriesScreen.colorFieldLabel}</Text>

          {/* 18-colour grid */}
          <View style={styles.colorGrid}>
            {CATEGORY_COLORS.map(c => (
              <Pressable
                key={c}
                onPress={() => handleSwatchPress(c)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  color === c && styles.colorSwatchSelected,
                ]}
                accessibilityRole="radio"
                accessibilityLabel={COPY.categoriesScreen.swatchA11y(c)}
                accessibilityState={{ checked: color === c }}
              />
            ))}
          </View>

          {/* Hex input row */}
          <View style={styles.hexRow}>
            <View
              style={[
                styles.hexPreview,
                {
                  backgroundColor: hexValid ? hexInput : color,
                  borderColor:     palette.line,
                },
              ]}
            />
            <View style={[
              styles.hexInputWrap,
              { backgroundColor: palette.surface2, borderColor: hexValid || hexInput === '' ? palette.line : ERROR_COLOR },
            ]}>
              <TextInput
                style={[styles.hexInput, { color: palette.text }]}
                value={hexInput}
                onChangeText={handleHexChange}
                placeholder={COPY.categoriesScreen.hexPlaceholder}
                placeholderTextColor={palette.faint}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={7}
                accessibilityLabel={COPY.categoriesScreen.hexA11y}
              />
            </View>
          </View>

          {/* ── Location type ── */}
          <Text style={[styles.fieldLabel, { color: palette.muted }]}>{COPY.categoriesScreen.locationFieldLabel}</Text>

          {/* Quick-pick chips + None */}
          <View style={styles.quickPickRow}>
            {/* None chip */}
            <Pressable
              onPress={() => handlePoiSelect(null)}
              style={[
                styles.poiChip,
                {
                  backgroundColor: poi === null ? palette.text  : palette.surface2,
                  borderColor:     poi === null ? palette.text  : palette.line,
                },
              ]}
              accessibilityRole="radio"
              accessibilityLabel={COPY.categoriesScreen.locationNone}
              accessibilityState={{ checked: poi === null }}>
              <Text style={[styles.poiChipText, { color: poi === null ? palette.bg : palette.muted }]}>
                {COPY.categoriesScreen.locationNone}
              </Text>
            </Pressable>

            {quickPoiOptions.map(opt => {
              const active = poi === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handlePoiSelect(opt.value)}
                  style={[
                    styles.poiChip,
                    {
                      backgroundColor: active ? palette.text  : palette.surface2,
                      borderColor:     active ? palette.text  : palette.line,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ checked: active }}>
                  <Text style={[styles.poiChipText, { color: active ? palette.bg : palette.muted }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Search for more types */}
          <View style={[
            styles.poiSearchWrap,
            { backgroundColor: palette.surface2, borderColor: palette.line },
          ]}>
            <TextInput
              style={[styles.poiSearchInput, { color: palette.text }]}
              value={poiQuery}
              onChangeText={handlePoiSearch}
              placeholder={COPY.categoriesScreen.locationSearchPlaceholder}
              placeholderTextColor={palette.faint}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel={COPY.categoriesScreen.locationSearchA11y}
            />
            {poiSearching && (
              <ActivityIndicator
                size="small"
                color={palette.muted}
                style={styles.poiSearchSpinner}
              />
            )}
          </View>

          {/* Search results */}
          {poiResults.length > 0 && (
            <View style={styles.poiResultsRow}>
              {poiResults.map(r => (
                <Pressable
                  key={r.type}
                  onPress={() => handlePoiSelect(r.type)}
                  style={[
                    styles.poiResultChip,
                    { borderColor: palette.line, backgroundColor: palette.surface2 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={r.label}>
                  <Text style={[styles.poiResultChipText, { color: palette.text }]}>
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Currently selected (non-quick-pick) */}
          {poi !== null && !quickPoiOptions.some(o => o.value === poi) && (
            <View style={styles.poiSelectedRow}>
              <Text style={[styles.poiSelectedLabel, { color: palette.muted }]}>
                {COPY.categoriesScreen.locationSelectedLabel}
              </Text>
              <View style={[styles.poiSelectedChip, { backgroundColor: palette.surface2, borderColor: palette.line }]}>
                <Text style={[styles.poiSelectedChipText, { color: palette.text }]}>
                  {placeTypeLabel(poi)}
                </Text>
              </View>
              <Pressable
                onPress={() => handlePoiSelect(null)}
                accessibilityRole="button"
                accessibilityLabel={COPY.categoriesScreen.locationClearA11y}>
                <Text style={[styles.poiClearX, { color: palette.muted }]}>×</Text>
              </Pressable>
            </View>
          )}

          {/* ── Actions ── */}
          <View style={styles.sheetActions}>
            <Pressable
              onPress={onCancel}
              style={[styles.cancelBtn, { borderColor: palette.line }]}
              accessibilityRole="button"
              accessibilityLabel={COPY.categoriesScreen.cancel}>
              <Text style={[styles.cancelLabel, { color: palette.muted }]}>{COPY.categoriesScreen.cancel}</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveBtn,
                { backgroundColor: palette.text, opacity: pressed ? 0.8 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={COPY.categoriesScreen.saveA11y}>
              <Text style={[styles.saveLabel, { color: palette.bg }]}>{COPY.categoriesScreen.save}</Text>
            </Pressable>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CategoriesScreen() {
  const { palette } = useTheme();
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const builtInCategories = buildBuiltInCategories();

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const uid = getAuth().currentUser?.uid ?? '';

  // ── ViewModel hook (KAN-59) ──────────────────────────────────────────────────
  const {
    categoriesState,
    retryKey: _retryKey,
    setRetryKey,
    customCategories,
    sheetVisible,
    editing,
    handleAdd,
    handleEdit,
    handleDelete,
    handleSave,
    handleCloseSheet,
  } = useCategoriesScreen(uid);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }]}>

      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: palette.line }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={COPY.categoriesScreen.backA11y}>
          <ChevronLeftIcon color={palette.text} size={22} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>{COPY.categoriesScreen.screenTitle}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Built-in ── */}
        <Text style={[styles.sectionLabel, { color: palette.muted }]}>{COPY.categoriesScreen.sectionBuiltIn}</Text>
        <View style={[styles.section, { borderColor: palette.line, backgroundColor: palette.surface }]}>
          {builtInCategories.map(cat => (
            <CategoryRow
              key={cat.id}
              category={cat}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </View>

        {/* ── Custom ── */}
        <Text style={[styles.sectionLabel, { color: palette.muted }]}>{COPY.categoriesScreen.sectionCustom}</Text>
        <View style={[styles.section, { borderColor: palette.line, backgroundColor: palette.surface }]}>
          {categoriesState.status === 'error' ? (
            // Error branch (KAN-58): show message + retry button
            <View style={styles.errorWrap}>
              <Text
                style={[styles.emptyText, { color: palette.muted }]}
                accessibilityRole="alert">
                {categoriesState.message || COPY.categoriesScreen.loadError}
              </Text>
              <Pressable
                onPress={() => setRetryKey(k => k + 1)}
                style={[styles.retryBtn, { borderColor: palette.line }]}
                accessibilityRole="button"
                accessibilityLabel={COPY.categoriesScreen.retry}>
                <Text style={[styles.retryLabel, { color: palette.text }]}>{COPY.categoriesScreen.retry}</Text>
              </Pressable>
            </View>
          ) : customCategories.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.muted }]}>
              {categoriesState.status === 'loading' ? COPY.categoriesScreen.loading : COPY.categoriesScreen.emptyCustom}
            </Text>
          ) : (
            customCategories.map(cat => (
              <CategoryRow
                key={cat.id}
                category={cat}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}

          {/* Add button */}
          <Pressable
            onPress={handleAdd}
            style={({ pressed }) => [
              styles.addBtn,
              { borderColor: palette.line, opacity: pressed ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={COPY.categoriesScreen.addCategoryA11y}>
            <Text style={[styles.addBtnLabel, { color: palette.accent }]}>{COPY.categoriesScreen.addCategory}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Add / Edit sheet */}
      <CategorySheet
        visible={sheetVisible}
        initial={editing}
        onSave={handleSave}
        onCancel={handleCloseSheet}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Top bar ──
  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.page,
    paddingVertical:   12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize:   17,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },

  // ── List ──
  scroll: { flex: 1 },
  sectionLabel: {
    fontSize:         11,
    fontWeight:       '600',
    fontFamily:       'Geist-SemiBold',
    letterSpacing:     1.2,
    marginTop:         24,
    marginBottom:       8,
    marginHorizontal:  spacing.page,
  },
  section: {
    marginHorizontal: spacing.page,
    borderRadius:     radius.card,
    borderWidth:      StyleSheet.hairlineWidth,
    overflow:         'hidden',
  },

  // ── Row ──
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingVertical:   14,
    gap:               12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colorDot: {
    width:        12,
    height:       12,
    borderRadius:  6,
    flexShrink:    0,
  },
  rowContent: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:            8,
    flexWrap:      'wrap',
  },
  rowName: {
    fontSize:   15,
    fontFamily: 'Geist-Regular',
  },
  poiBadge: {
    borderRadius:      9999,
    borderWidth:        1,
    paddingHorizontal: 8,
    paddingVertical:   2,
  },
  poiBadgeText: {
    fontSize:   11,
    fontFamily: 'Geist-Regular',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:            4,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  actionLabel: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },
  deleteBtn: {
    width:          32,
    height:         32,
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:    16,
  },
  deleteX: {
    fontSize:   20,
    lineHeight: 24,
    color:      ERROR_COLOR,
    fontFamily: 'Geist-Regular',
  },

  // ── Error retry (KAN-58) ──
  errorWrap: {
    paddingHorizontal: 16,
    paddingVertical:   14,
    gap: 10,
  },
  retryBtn: {
    alignSelf:         'flex-start',
    paddingHorizontal: 14,
    paddingVertical:    8,
    borderRadius:       8,
    borderWidth:        1,
  },
  retryLabel: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
  },

  // ── Add button ──
  emptyText: {
    fontSize:          14,
    fontFamily:        'Geist-Regular',
    paddingHorizontal: 16,
    paddingVertical:   14,
  },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderTopWidth:    StyleSheet.hairlineWidth,
  },
  addBtnLabel: {
    fontSize:   15,
    fontWeight: '500',
    fontFamily: 'Geist-Regular',
  },

  // ── Sheet ──
  scrim: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetOuter: {
    position: 'absolute',
    bottom:    0,
    left:      0,
    right:     0,
  },
  sheet: {
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    paddingHorizontal:    spacing.page,
    paddingTop:           12,
  },
  handle: {
    width:        40,
    height:        4,
    borderRadius:  2,
    alignSelf:    'center',
    marginBottom:  16,
  },
  sheetTitle: {
    fontSize:     17,
    fontWeight:   '600',
    fontFamily:   'Geist-SemiBold',
    marginBottom:  20,
  },
  fieldLabel: {
    fontSize:      11,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
    letterSpacing:  1,
    marginBottom:   8,
  },
  nameInputWrap: {
    borderRadius:      radius.ctaBtn,
    borderWidth:       1,
    paddingHorizontal: 14,
    marginBottom:       4,
  },
  nameInput: {
    fontSize:        15,
    fontFamily:      'Geist-Regular',
    paddingVertical: 13,
  },
  nameErr: {
    fontSize:     12,
    fontFamily:   'Geist-Regular',
    color:        ERROR_COLOR,
    marginBottom:  8,
  },

  // ── Colour grid ──
  colorGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:            10,
    marginBottom:   12,
  },
  colorSwatch: {
    width:        36,
    height:       36,
    borderRadius: 18,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.28)',
  },

  // ── Hex input ──
  hexRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:            10,
    marginBottom:   20,
  },
  hexPreview: {
    width:        32,
    height:       32,
    borderRadius:  8,
    borderWidth:   1,
    flexShrink:    0,
  },
  hexInputWrap: {
    flex:              1,
    borderRadius:       8,
    borderWidth:        1,
    paddingHorizontal: 12,
  },
  hexInput: {
    fontSize:        13,
    fontFamily:      'Geist-Regular',
    paddingVertical:  8,
  },

  // ── POI picker ──
  quickPickRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:            8,
    marginBottom:   12,
  },
  poiChip: {
    borderRadius:      9999,
    borderWidth:        1,
    paddingHorizontal: 14,
    paddingVertical:    7,
  },
  poiChipText: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },
  poiSearchWrap: {
    flexDirection:     'row',
    alignItems:        'center',
    borderRadius:       8,
    borderWidth:        1,
    paddingHorizontal: 12,
    marginBottom:       8,
  },
  poiSearchInput: {
    flex:            1,
    fontSize:        14,
    fontFamily:      'Geist-Regular',
    paddingVertical: 10,
  },
  poiSearchSpinner: {
    marginLeft: 8,
  },
  poiResultsRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:            8,
    marginBottom:   8,
  },
  poiResultChip: {
    borderRadius:      9999,
    borderWidth:        1,
    paddingHorizontal: 12,
    paddingVertical:    6,
  },
  poiResultChipText: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },
  poiSelectedRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:            8,
    marginBottom:   16,
  },
  poiSelectedLabel: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
  },
  poiSelectedChip: {
    borderRadius:      9999,
    borderWidth:        1,
    paddingHorizontal: 10,
    paddingVertical:    4,
  },
  poiSelectedChipText: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },
  poiClearX: {
    fontSize:   20,
    lineHeight: 24,
    fontFamily: 'Geist-Regular',
  },

  // ── Sheet actions ──
  sheetActions: {
    flexDirection: 'row',
    gap:            12,
    marginTop:       8,
  },
  cancelBtn: {
    flex:            1,
    borderRadius:    radius.ctaBtn,
    borderWidth:      1,
    paddingVertical: 14,
    alignItems:      'center',
  },
  cancelLabel: {
    fontSize:   15,
    fontFamily: 'Geist-Regular',
  },
  saveBtn: {
    flex:            2,
    borderRadius:    radius.ctaBtn,
    paddingVertical: 14,
    alignItems:      'center',
  },
  saveLabel: {
    fontSize:   15,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
});
