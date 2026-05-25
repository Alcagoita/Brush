/**
 * CategoriesScreen — KAN-16
 *
 * Layout (top → bottom):
 *   1. Top bar      — back button + "Categories" title
 *   2. Category list
 *      BUILT-IN section  — 4 design-system rows (read-only)
 *      CUSTOM section    — user-created rows with edit + delete actions
 *   3. "Add category" button (bottom of custom section)
 *   4. Add/Edit bottom sheet (Modal)
 *      - Name text input
 *      - Color picker (4 design-system swatches)
 *      - POI picker   (None + 4 POI types)
 *      - Save / Cancel
 *
 * Rules:
 *   - Built-in categories cannot be renamed, recoloured, or deleted.
 *   - Custom categories are stored in /users/{uid}/categories/{id}.
 *   - All colours via useTheme() — no hardcoded values.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  subscribeToCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from '../services/firestore';
import { Category, PoiType } from '../types';
import { ChevronLeftIcon } from '../components/AppIcon';

// ─── Constants ────────────────────────────────────────────────────────────────

/** The 4 design-system category colors available to all categories. */
export const CATEGORY_COLORS = [
  '#5b7fd4', // Work  — soft blue
  '#5ba87a', // Health — sage
  '#8b6bc4', // Errands — muted purple
  '#e8a86a', // Personal — peach
] as const;

const POI_OPTIONS: { value: PoiType | null; label: string }[] = [
  { value: null,         label: 'None' },
  { value: 'atm',        label: 'ATM' },
  { value: 'cafe',       label: 'Café' },
  { value: 'supermarket',label: 'Supermarket' },
  { value: 'pharmacy',   label: 'Pharmacy' },
];

/** Built-in categories derived from design tokens — never stored in Firestore. */
const BUILT_IN_CATEGORIES: Category[] = [
  { id: 'work',      name: 'Work',      color: builtInMeta.work.color,     poi: null,           isBuiltIn: true },
  { id: 'health',    name: 'Health',    color: builtInMeta.health.color,   poi: 'pharmacy',     isBuiltIn: true },
  { id: 'errands',   name: 'Errands',   color: builtInMeta.errands.color,  poi: 'supermarket',  isBuiltIn: true },
  { id: 'personal',  name: 'Personal',  color: builtInMeta.personal.color, poi: 'cafe',         isBuiltIn: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function poiLabel(poi: PoiType | null): string {
  return POI_OPTIONS.find(o => o.value === poi)?.label ?? 'None';
}

// ─── CategoryRow ──────────────────────────────────────────────────────────────

interface CategoryRowProps {
  category:  Category;
  onEdit:    (cat: Category) => void;
  onDelete:  (cat: Category) => void;
}

function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
  const { palette } = useTheme();
  const hasPoi = category.poi !== null;

  return (
    <View
      style={[styles.row, { borderBottomColor: palette.line }]}
      accessibilityLabel={`${category.name} category`}>
      {/* Colour dot */}
      <View style={[styles.colorDot, { backgroundColor: category.color }]} />

      {/* Name + POI badge */}
      <View style={styles.rowContent}>
        <Text style={[styles.rowName, { color: palette.text }]}>{category.name}</Text>
        {hasPoi && (
          <View style={[styles.poiBadge, { backgroundColor: palette.surface2, borderColor: palette.line }]}>
            <Text style={[styles.poiBadgeText, { color: palette.muted }]}>
              {poiLabel(category.poi)}
            </Text>
          </View>
        )}
      </View>

      {/* Edit / delete — custom categories only */}
      {!category.isBuiltIn && (
        <View style={styles.rowActions}>
          <Pressable
            onPress={() => onEdit(category)}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${category.name}`}>
            <Text style={[styles.actionLabel, { color: palette.muted }]}>Edit</Text>
          </Pressable>
          <Pressable
            onPress={() => onDelete(category)}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${category.name}`}>
            <Text style={[styles.actionLabel, { color: '#e05252' }]}>Delete</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Add / Edit sheet ─────────────────────────────────────────────────────────

interface SheetProps {
  visible:   boolean;
  initial:   Partial<Category> | null; // null = add mode
  onSave:    (data: Omit<Category, 'id' | 'isBuiltIn'>) => Promise<void>;
  onCancel:  () => void;
}

function CategorySheet({ visible, initial, onSave, onCancel }: SheetProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const [name,    setName]    = useState('');
  const [color,   setColor]   = useState<string>(CATEGORY_COLORS[0]);
  const [poi,     setPoi]     = useState<PoiType | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [nameErr, setNameErr] = useState('');

  // Populate form when opening
  useEffect(() => {
    if (visible) {
      setName(initial?.name  ?? '');
      setColor(initial?.color ?? CATEGORY_COLORS[0]);
      setPoi(initial?.poi   ?? null);
      setNameErr('');
      setSaving(false);
    }
  }, [visible, initial]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameErr('Please enter a category name.'); return; }
    setSaving(true);
    try {
      await onSave({ name: trimmed, color, poi });
    } finally {
      setSaving(false);
    }
  };

  const isAdd = initial === null;

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
              backgroundColor:  palette.surface,
              paddingBottom:    insets.bottom + 16,
            },
          ]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: palette.faint }]} />

          <Text style={[styles.sheetTitle, { color: palette.text }]}>
            {isAdd ? 'New Category' : 'Edit Category'}
          </Text>

          {/* Name */}
          <Text style={[styles.fieldLabel, { color: palette.muted }]}>NAME</Text>
          <View style={[
            styles.nameInputWrap,
            { backgroundColor: palette.surface2, borderColor: nameErr ? '#e05252' : palette.line },
          ]}>
            <TextInput
              style={[styles.nameInput, { color: palette.text }]}
              placeholder="Category name"
              placeholderTextColor={palette.faint}
              value={name}
              onChangeText={v => { setName(v); if (nameErr) { setNameErr(''); } }}
              autoFocus={visible}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              accessibilityLabel="Category name"
            />
          </View>
          {nameErr ? (
            <Text style={styles.nameErr}>{nameErr}</Text>
          ) : null}

          {/* Color */}
          <Text style={[styles.fieldLabel, { color: palette.muted }]}>COLOUR</Text>
          <View style={styles.colorRow}>
            {CATEGORY_COLORS.map(c => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  color === c && styles.colorSwatchSelected,
                ]}
                accessibilityRole="radio"
                accessibilityLabel={`Color ${c}`}
                accessibilityState={{ checked: color === c }}
              />
            ))}
          </View>

          {/* POI */}
          <Text style={[styles.fieldLabel, { color: palette.muted }]}>LOCATION TYPE</Text>
          <View style={styles.poiRow}>
            {POI_OPTIONS.map(opt => {
              const active = poi === opt.value;
              return (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => setPoi(opt.value)}
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

          {/* Actions */}
          <View style={styles.sheetActions}>
            <Pressable
              onPress={onCancel}
              style={[styles.cancelBtn, { borderColor: palette.line }]}
              accessibilityRole="button"
              accessibilityLabel="Cancel">
              <Text style={[styles.cancelLabel, { color: palette.muted }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveBtn,
                { backgroundColor: palette.text, opacity: (saving || pressed) ? 0.8 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save category">
              {saving
                ? <ActivityIndicator color={palette.bg} />
                : <Text style={[styles.saveLabel, { color: palette.bg }]}>Save</Text>
              }
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

  const user = getAuth().currentUser;
  const uid  = user?.uid ?? '';

  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [sheetVisible,     setSheetVisible]     = useState(false);
  const [editing,          setEditing]          = useState<Category | null>(null);

  // Live subscription to custom categories
  useEffect(() => {
    if (!uid) { return; }
    return subscribeToCategories(uid, setCustomCategories);
  }, [uid]);

  const handleAdd = useCallback(() => {
    setEditing(null);
    setSheetVisible(true);
  }, []);

  const handleEdit = useCallback((cat: Category) => {
    setEditing(cat);
    setSheetVisible(true);
  }, []);

  const handleDelete = useCallback((cat: Category) => {
    Alert.alert(
      'Delete Category',
      `Delete "${cat.name}"? Tasks using this category will keep their assignment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCategory(uid, cat.id).catch(err =>
            console.warn('[CategoriesScreen] delete failed', err),
          ),
        },
      ],
    );
  }, [uid]);

  const handleSave = useCallback(async (data: Omit<Category, 'id' | 'isBuiltIn'>) => {
    if (editing) {
      await updateCategory(uid, editing.id, data);
    } else {
      await addCategory(uid, data);
    }
    setSheetVisible(false);
  }, [uid, editing]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }]}>

      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: palette.line }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <ChevronLeftIcon color={palette.text} size={22} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>Categories</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}>

        {/* ── Built-in ── */}
        <Text style={[styles.sectionLabel, { color: palette.muted }]}>BUILT-IN</Text>
        <View style={[styles.section, { borderColor: palette.line, backgroundColor: palette.surface }]}>
          {BUILT_IN_CATEGORIES.map(cat => (
            <CategoryRow
              key={cat.id}
              category={cat}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </View>

        {/* ── Custom ── */}
        <Text style={[styles.sectionLabel, { color: palette.muted }]}>CUSTOM</Text>
        <View style={[styles.section, { borderColor: palette.line, backgroundColor: palette.surface }]}>
          {customCategories.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.muted }]}>
              No custom categories yet
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
            accessibilityLabel="Add category">
            <Text style={[styles.addBtnLabel, { color: palette.accent }]}>+ Add Category</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Add / Edit sheet */}
      <CategorySheet
        visible={sheetVisible}
        initial={editing}
        onSave={handleSave}
        onCancel={() => setSheetVisible(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:  { flex: 1 },

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
    fontSize:      11,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
    letterSpacing:  1.2,
    marginTop:      24,
    marginBottom:    8,
    marginHorizontal: spacing.page,
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
    borderRadius: 6,
    flexShrink:   0,
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
    borderRadius:    9999,
    borderWidth:     1,
    paddingHorizontal: 8,
    paddingVertical:   2,
  },
  poiBadgeText: {
    fontSize:   11,
    fontFamily: 'Geist-Regular',
  },
  rowActions: {
    flexDirection: 'row',
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

  // ── Add button ──
  emptyText: {
    fontSize:      14,
    fontFamily:    'Geist-Regular',
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
    position:        'absolute',
    bottom:           0,
    left:             0,
    right:            0,
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
    fontSize:      17,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
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
    borderRadius:  radius.ctaBtn,
    borderWidth:   1,
    paddingHorizontal: 14,
    marginBottom:   4,
  },
  nameInput: {
    fontSize:        15,
    fontFamily:      'Geist-Regular',
    paddingVertical: 13,
  },
  nameErr: {
    fontSize:     12,
    fontFamily:   'Geist-Regular',
    color:        '#e05252',
    marginBottom:  8,
  },
  colorRow: {
    flexDirection: 'row',
    gap:            12,
    marginBottom:   20,
  },
  colorSwatch: {
    width:        36,
    height:       36,
    borderRadius: 18,
  },
  colorSwatchSelected: {
    borderWidth:  3,
    borderColor:  'rgba(0,0,0,0.25)',
  },
  poiRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:            8,
    marginBottom:   24,
  },
  poiChip: {
    borderRadius:      9999,
    borderWidth:       1,
    paddingHorizontal: 14,
    paddingVertical:    7,
  },
  poiChipText: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },
  sheetActions: {
    flexDirection: 'row',
    gap:            12,
  },
  cancelBtn: {
    flex:            1,
    borderRadius:    radius.ctaBtn,
    borderWidth:     1,
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
