/**
 * ShareReceiveScreen — KAN-90
 *
 * Shown when the user shares a text message into Brush from another app
 * (WhatsApp, iMessage, clipboard, etc.) via the Android Share Intent.
 *
 * Flow:
 *   1. Loading     — spinner while parseMessageToTask Cloud Function runs
 *   2. Confirmation — editable form pre-filled from AI parse result
 *   3. Failure     — raw message in title field + manual-entry note
 *                    (shown when confidence === 'low' or on parse error)
 *
 * Navigation params: { sharedText: string }
 * On confirm:  writes task to Firestore, navigates to Today
 * On discard:  navigates back (or Today if no back history)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { addTask } from '../services/firestore';
import { parseMessageToTask } from '../services/functions';
import { getCurrentUser } from '../services/auth';
import { PoiIcon } from '../components/AppIcon';
import type { PoiType } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

// ─── Types ────────────────────────────────────────────────────────────────────

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'confirmation'; title: string; poi: PoiType | null; time: string | null }
  | { kind: 'failure' };

const POI_OPTIONS: { type: PoiType; label: string }[] = [
  { type: 'atm',         label: 'ATM'      },
  { type: 'cafe',        label: 'Café'     },
  { type: 'supermarket', label: 'Market'   },
  { type: 'pharmacy',    label: 'Pharmacy' },
];

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDueDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function parseTime(s: string): Date {
  const [hh, mm] = s.split(':').map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ label, color }: { label: string; color: string }) {
  return <Text style={[styles.sectionLabel, { color }]}>{label}</Text>;
}

interface PoiChipProps {
  selected: boolean;
  onPress: () => void;
  label: string;
  type: PoiType;
  palette: ReturnType<typeof useTheme>['palette'];
}

function PoiChipBtn({ selected, onPress, label, type, palette }: PoiChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.poiChip,
        {
          backgroundColor: selected ? palette.nearTint2  : palette.surface,
          borderColor:     selected ? palette.nearBorder : palette.line,
        },
      ]}>
      <PoiIcon type={type} color={selected ? palette.nearText : palette.muted} size={16} />
      <Text style={[styles.poiChipLabel, { color: selected ? palette.nearText : palette.muted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ShareReceiveScreen() {
  const { palette } = useTheme();
  const navigation  = useNavigation();
  const insets      = useSafeAreaInsets();
  const route       = useRoute<RouteProp<RootStackParamList, 'ShareReceive'>>();

  const { sharedText } = route.params;

  // ── Screen state (loading → confirmation | failure) ─────────────────────────
  const [screenState, setScreenState] = useState<ScreenState>({ kind: 'loading' });
  // Incrementing retryKey re-runs the parse effect (Try again button).
  const [retryKey, setRetryKey] = useState(0);

  const handleRetry = useCallback(() => {
    seeded.current = false;
    setScreenState({ kind: 'loading' });
    setRetryKey(k => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    parseMessageToTask(sharedText)
      .then(result => {
        if (cancelled) { return; }
        if (result.confidence === 'low') {
          setScreenState({ kind: 'failure' });
        } else {
          setScreenState({
            kind:  'confirmation',
            title: result.title,
            poi:   result.suggestedPoi,
            time:  result.suggestedTime,
          });
        }
      })
      .catch(err => {
        if (cancelled) { return; }
        console.warn('[ShareReceiveScreen] parseMessageToTask error:', err);
        setScreenState({ kind: 'failure' });
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedText, retryKey]);

  // ── Form state (editable by user once loaded) ───────────────────────────────
  const [title,     setTitle]     = useState('');
  const [poi,       setPoi]       = useState<PoiType | null>(null);
  const [time,      setTime]      = useState<string | null>(null);
  const [category,  setCategory]  = useState<string>('personal');
  const [dueDate,   setDueDate]   = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerDate, setTimePickerDate] = useState<Date>(new Date());
  const [titleError, setTitleError] = useState('');
  const titleRef = useRef<TextInput>(null);

  // Seed form state when screen state resolves
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) { return; }
    if (screenState.kind === 'confirmation') {
      seeded.current = true;
      setTitle(screenState.title);
      setPoi(screenState.poi);
      if (screenState.time) {
        setTime(screenState.time);
        setTimePickerDate(parseTime(screenState.time));
      }
    } else if (screenState.kind === 'failure') {
      seeded.current = true;
      // Pre-fill title with the raw shared text (truncated to 80 chars)
      setTitle(sharedText.slice(0, 80));
    }
  }, [screenState, sharedText]);

  // ── Save ────────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  const handleSave = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError('Title is required.');
      titleRef.current?.focus();
      return;
    }
    setTitleError('');
    const uid = getCurrentUser()?.uid;
    if (!uid) { return; }

    setSubmitting(true);
    try {
      const dateStr = dueDate
        ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`
        : todayISO();

      await addTask(uid, {
        title:    trimmed,
        category,
        done:     false,
        poi:      poi ?? undefined,
        time:     time ?? undefined,
        date:     dateStr,
      });

      // Navigate to Today; this also works as "close" if launched fresh from a share.
      navigation.navigate('Today' as never);
    } catch (err) {
      console.warn('[ShareReceiveScreen] addTask error:', err);
    } finally {
      setSubmitting(false);
    }
  }, [title, category, poi, time, dueDate, navigation]);

  const handleDiscard = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Today' as never);
    }
  }, [navigation]);

  // ── Category list ────────────────────────────────────────────────────────────
  const allCategories = Object.entries(builtInCategories).map(([key, val]) => ({
    id: key, label: val.label, color: val.color,
  }));

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: palette.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* ── Nav bar ── */}
      <View style={[
        styles.navBar,
        {
          paddingTop:        insets.top + 8,
          borderBottomColor: palette.line,
          backgroundColor:   palette.bg,
        },
      ]}>
        <Pressable
          onPress={handleDiscard}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Discard">
          <Text style={[styles.navCancel, { color: palette.muted }]}>Discard</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: palette.text }]}>Add from message</Text>
        {/* spacer — keeps title centred */}
        <Text style={[styles.navCancel, { color: 'transparent' }]}>Discard</Text>
      </View>

      {/* ── Loading ── */}
      {screenState.kind === 'loading' && (
        <View style={styles.loadingContainer} testID="loading-state">
          {/* Raw message preview */}
          <View style={[styles.rawCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
            <Text
              style={[styles.rawCardText, { color: palette.muted }]}
              numberOfLines={4}
              ellipsizeMode="tail">
              {sharedText}
            </Text>
          </View>
          <ActivityIndicator size="large" color={palette.accent} style={styles.spinner} />
          <Text style={[styles.loadingLabel, { color: palette.muted }]}>Parsing message…</Text>
        </View>
      )}

      {/* ── Confirmation + Failure (share form) ── */}
      {screenState.kind !== 'loading' && (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Failure notice ── */}
          {screenState.kind === 'failure' && (
            <View style={[styles.failureNote, { backgroundColor: palette.surface, borderColor: palette.line }]}
              testID="failure-note">
              <Text style={[styles.failureNoteText, { color: palette.muted }]}>
                We couldn't parse a brush automatically. Add the details manually.
              </Text>
              <Pressable
                onPress={handleRetry}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Try again"
                testID="retry-btn">
                <Text style={[styles.retryLabel, { color: palette.accent }]}>Try again</Text>
              </Pressable>
            </View>
          )}

          {/* ── AI suggestion label (confirmation only) ── */}
          {screenState.kind === 'confirmation' && (
            <Text style={[styles.aiLabel, { color: palette.accent }]}>
              AI suggestion — tap to edit
            </Text>
          )}

          {/* ── Title ── */}
          <TextInput
            ref={titleRef}
            style={[styles.titleInput, { color: palette.text, borderBottomColor: palette.line }]}
            placeholder="Brush title"
            placeholderTextColor={palette.faint}
            value={title}
            onChangeText={v => { setTitle(v); if (titleError) { setTitleError(''); } }}
            autoFocus={screenState.kind === 'failure'}
            returnKeyType="done"
            accessibilityLabel="Title"
            maxLength={200}
            testID="title-input"
          />
          {titleError ? (
            <Text style={styles.titleError}>{titleError}</Text>
          ) : null}

          {/* ── Full form (confirmation state only) ── */}
          {screenState.kind === 'confirmation' && (
            <>
              {/* POI chips */}
              <View style={[styles.divider, { backgroundColor: palette.line }]} />
              <View style={styles.section}>
                <SectionLabel label="LOCATION" color={palette.muted} />
                <View style={styles.poiRow}>
                  {/* None pill */}
                  <Pressable
                    onPress={() => setPoi(null)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: poi === null }}
                    style={[
                      styles.poiChip,
                      {
                        backgroundColor: poi === null ? palette.surface2 : palette.surface,
                        borderColor:     poi === null ? palette.text      : palette.line,
                      },
                    ]}>
                    <Text style={[styles.poiChipLabel, { color: poi === null ? palette.text : palette.muted }]}>
                      None
                    </Text>
                  </Pressable>
                  {POI_OPTIONS.map(opt => (
                    <PoiChipBtn
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

              {/* Time */}
              <View style={[styles.divider, { backgroundColor: palette.line }]} />
              <View style={styles.section}>
                <SectionLabel label="TIME" color={palette.muted} />
                {time ? (
                  <View style={styles.chipRow}>
                    <Pressable
                      onPress={() => setShowTimePicker(true)}
                      style={[styles.chip, { backgroundColor: palette.surface, borderColor: palette.line }]}>
                      <Text style={[styles.chipLabel, { color: palette.text }]}>{time}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setTime(null)}
                      hitSlop={8}
                      style={[styles.chipClear, { borderColor: palette.line }]}
                      accessibilityLabel="Clear time">
                      <Text style={[styles.chipClearLabel, { color: palette.accent }]}>✕</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setShowTimePicker(true)}
                    style={[styles.addChipBtn, { borderColor: palette.line }]}
                    accessibilityLabel="Set time">
                    <Text style={[styles.addChipLabel, { color: palette.muted }]}>Set time</Text>
                  </Pressable>
                )}
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
              </View>

              {/* Due date */}
              <View style={[styles.divider, { backgroundColor: palette.line }]} />
              <View style={styles.section}>
                <SectionLabel label="DUE DATE" color={palette.muted} />
                {dueDate ? (
                  <View style={styles.chipRow}>
                    <Pressable
                      onPress={() => setShowDatePicker(true)}
                      style={[styles.chip, { backgroundColor: palette.surface, borderColor: palette.line }]}>
                      <Text style={[styles.chipLabel, { color: palette.text }]}>
                        {formatDueDate(dueDate)}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setDueDate(null)}
                      hitSlop={8}
                      style={[styles.chipClear, { borderColor: palette.line }]}
                      accessibilityLabel="Clear date">
                      <Text style={[styles.chipClearLabel, { color: palette.accent }]}>✕</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={[styles.addChipBtn, { borderColor: palette.line }]}
                    accessibilityLabel="Set due date">
                    <Text style={[styles.addChipLabel, { color: palette.muted }]}>Set date</Text>
                  </Pressable>
                )}
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
              </View>

              {/* Category */}
              <View style={[styles.divider, { backgroundColor: palette.line }]} />
              <View style={styles.section}>
                <SectionLabel label="CATEGORY" color={palette.muted} />
                <View style={styles.pillWrap}>
                  {allCategories.map(cat => (
                    <Pressable
                      key={cat.id}
                      onPress={() => setCategory(cat.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: category === cat.id }}
                      style={[
                        styles.pill,
                        {
                          backgroundColor: category === cat.id ? cat.color + '22' : palette.surface,
                          borderColor:     category === cat.id ? cat.color        : palette.line,
                        },
                      ]}>
                      <View style={[styles.pillDot, { backgroundColor: cat.color }]} />
                      <Text style={[styles.pillLabel, { color: cat.color }]}>{cat.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* ── CTAs ── */}
          <View style={[styles.divider, { backgroundColor: palette.line, marginTop: 8 }]} />

          <Pressable
            onPress={handleSave}
            disabled={submitting}
            style={[
              styles.addBtn,
              { backgroundColor: submitting ? palette.faint : palette.text },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add brush"
            testID="add-task-btn">
            <Text style={[styles.addBtnLabel, { color: palette.bg }]}>
              {submitting ? 'Saving…' : 'Add brush'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleDiscard}
            disabled={submitting}
            style={styles.discardBtn}
            accessibilityRole="button"
            accessibilityLabel="Discard"
            testID="discard-btn">
            <Text style={[styles.discardBtnLabel, { color: palette.muted }]}>Discard</Text>
          </Pressable>

        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Nav bar ──
  navBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.page,
    paddingBottom:     14,
    borderBottomWidth: 1,
  },
  navCancel: {
    fontSize:   16,
    fontFamily: 'Geist-Regular',
  },
  navTitle: {
    fontSize:   16,
    fontFamily: 'Geist-SemiBold',
  },

  // ── Loading ──
  loadingContainer: {
    flex:            1,
    paddingTop:      24,
    paddingHorizontal: spacing.page,
    alignItems:      'center',
  },
  rawCard: {
    width:         '100%',
    borderRadius:  radius.card,
    borderWidth:   1,
    padding:       16,
    marginBottom:  24,
  },
  rawCardText: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
    lineHeight: 20,
  },
  spinner: {
    marginBottom: 12,
  },
  loadingLabel: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
  },

  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: spacing.page,
    paddingTop:        8,
  },

  // ── Failure notice ──
  failureNote: {
    borderRadius:  radius.card,
    borderWidth:   1,
    padding:       14,
    marginBottom:  16,
    marginTop:     8,
  },
  failureNoteText: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
    lineHeight: 18,
  },
  retryLabel: {
    fontSize:   13,
    fontFamily: 'Geist-Medium',
    marginTop:  10,
  },

  // ── AI suggestion label ──
  aiLabel: {
    fontSize:      11,
    fontFamily:    'Geist-SemiBold',
    letterSpacing:  0.5,
    marginTop:     12,
    marginBottom:   4,
  },

  // ── Title ──
  titleInput: {
    fontSize:         22,
    fontFamily:       'Geist-Medium',
    paddingVertical:  20,
    borderBottomWidth: 1,
  },
  titleError: {
    marginTop:  4,
    fontSize:   12,
    fontFamily: 'Geist-Regular',
    color:      '#e05252',
  },

  // ── Divider ──
  divider: {
    height:         1,
    marginVertical: 4,
  },

  // ── Sections ──
  section: {
    paddingVertical: 14,
    gap:             10,
  },
  sectionLabel: {
    fontSize:      11,
    fontFamily:    'Geist-SemiBold',
    letterSpacing:  0.6,
  },

  // ── POI chips ──
  poiRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
  },
  poiChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:                4,
    borderRadius:      radius.chip,
    borderWidth:       1,
    paddingHorizontal: 12,
    paddingVertical:   7,
  },
  poiChipLabel: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
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
    fontSize:    14,
    fontFamily:  'Geist-Regular',
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

  // ── CTAs ──
  addBtn: {
    marginTop:    16,
    borderRadius: radius.ctaBtn,
    paddingVertical: 16,
    alignItems:   'center',
  },
  addBtnLabel: {
    fontSize:   16,
    fontFamily: 'Geist-SemiBold',
  },
  discardBtn: {
    alignItems:      'center',
    paddingVertical: 18,
  },
  discardBtnLabel: {
    fontSize:   15,
    fontFamily: 'Geist-Regular',
  },
});
