/**
 * NotificationPreferencesScreen — KAN-80
 *
 * Settings hub for all notification toggles introduced in Sprint 8 Track B.
 * Each row reads from / writes to users/{uid}/userPreferences/prefs.
 *
 * Sections:
 *   DAILY     — End-of-day check-in (KAN-120): toggle + time picker
 *   STREAKS   — Streak at risk (KAN-121): toggle
 *   SUMMARY   — Weekly recap (KAN-123): toggle
 *   ENGAGEMENT — Re-engagement reminders (KAN-124): toggle
 *
 * Rows for KAN-119 (exit prompt), KAN-122 (achievement nudge), and
 * KAN-125 (friend activity) are added by those tickets respectively.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import {
  subscribeToUserPreferences,
  updateUserPreferences,
} from '../services/firestore';
import { scheduleEodReminder, cancelEodReminder } from '../services/notifications';
import { subscribeToTasksForDate } from '../services/firestore';
import {
  BellIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ClockIcon,
} from '../components/AppIcon';
import { RootStackParamList } from '../navigation/AppNavigator';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Time options for the EOD picker (30-min increments, 6 PM – midnight) ─────

const EOD_TIMES = [
  '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30',
];

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour   = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={s.sectionWrapper}>
      <Text style={[s.sectionLabel, { color: palette.muted }]}>{title}</Text>
      <View style={[s.card, { backgroundColor: palette.surface, borderColor: palette.line }]}>
        {children}
      </View>
    </View>
  );
}

interface PrefRowProps {
  Icon:    React.FC<{ color: string; size?: number }>;
  label:   string;
  sublabel?: string;
  value:   boolean;
  onToggle: (v: boolean) => void;
  isLast?: boolean;
  disabled?: boolean;
}

function PrefRow({ Icon, label, sublabel, value, onToggle, isLast = false, disabled = false }: PrefRowProps) {
  const { palette } = useTheme();
  return (
    <>
      <View style={s.row}>
        <View style={[s.iconTile, { backgroundColor: palette.surface2 }]}>
          <Icon color={palette.muted} size={19} />
        </View>
        <View style={s.rowLabelGroup}>
          <Text style={[s.rowLabel, { color: palette.text }]}>{label}</Text>
          {sublabel ? (
            <Text style={[s.rowSublabel, { color: palette.muted }]} numberOfLines={2}>
              {sublabel}
            </Text>
          ) : null}
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ true: palette.accent, false: palette.surface2 }}
          thumbColor={Platform.OS === 'android' ? palette.bg : undefined}
          accessibilityRole="switch"
          accessibilityLabel={label}
          accessibilityState={{ checked: value }}
        />
      </View>
      {!isLast && <View style={[s.divider, { backgroundColor: palette.line }]} />}
    </>
  );
}

interface TimePickerRowProps {
  selectedTime: string;
  onSelect: (time: string) => void;
  isLast?: boolean;
}

function TimePickerRow({ selectedTime, onSelect, isLast = false }: TimePickerRowProps) {
  const { palette } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Pressable
        style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}
        onPress={() => setExpanded(v => !v)}
        accessibilityRole="button"
        accessibilityLabel={`Reminder time: ${formatTime(selectedTime)}`}>
        <View style={[s.iconTile, { backgroundColor: palette.surface2 }]}>
          <ClockIcon color={palette.muted} size={19} />
        </View>
        <Text style={[s.rowLabel, { color: palette.text }]}>Reminder time</Text>
        <Text style={[s.timeValue, { color: palette.muted }]}>
          {formatTime(selectedTime)}
        </Text>
      </Pressable>
      {expanded && (
        <View style={[s.timePicker, { borderTopColor: palette.line }]}>
          {EOD_TIMES.map((t, i) => {
            const selected = t === selectedTime;
            return (
              <Pressable
                key={t}
                style={({ pressed }) => [
                  s.timeOption,
                  i < EOD_TIMES.length - 1 && { borderBottomColor: palette.line, borderBottomWidth: StyleSheet.hairlineWidth },
                  pressed && { opacity: 0.6 },
                ]}
                onPress={() => { onSelect(t); setExpanded(false); }}
                accessibilityRole="radio"
                accessibilityLabel={formatTime(t)}
                accessibilityState={{ selected }}>
                <Text style={[s.timeOptionText, { color: selected ? palette.accent : palette.text }]}>
                  {formatTime(t)}
                </Text>
                {selected && (
                  <View style={[s.timeSelectedDot, { backgroundColor: palette.accent }]} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
      {!isLast && !expanded && <View style={[s.divider, { backgroundColor: palette.line }]} />}
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationPreferencesScreen() {
  const { palette } = useTheme();
  const navigation  = useNavigation<Nav>();
  const insets      = useSafeAreaInsets();
  const uid         = getAuth().currentUser?.uid ?? '';

  const [prefs,   setPrefs]   = useState<Partial<UserPreferences>>({});
  const [loading, setLoading] = useState(true);

  // ── Live subscription ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) { return; }
    return subscribeToUserPreferences(
      uid,
      p => { setPrefs(p); setLoading(false); },
      err => { console.warn('[NotifPrefs] subscription error', err); setLoading(false); },
    );
  }, [uid]);

  // ── Derived preference values with defaults ────────────────────────────────
  const eodEnabled  = prefs.eodReminder?.enabled  ?? DEFAULT_USER_PREFERENCES.eodReminder.enabled;
  const eodTime     = prefs.eodReminder?.time      ?? DEFAULT_USER_PREFERENCES.eodReminder.time;
  const streakOn    = prefs.streakReminder         ?? DEFAULT_USER_PREFERENCES.streakReminder;
  const weeklyOn    = prefs.weeklyRecap            ?? DEFAULT_USER_PREFERENCES.weeklyRecap;
  const reengageOn  = prefs.reengagementReminders  ?? DEFAULT_USER_PREFERENCES.reengagementReminders;

  // ── Incomplete POI task count — drives EOD scheduling ─────────────────────
  const [incompletePoiCount, setIncompletePoiCount] = useState(0);

  useEffect(() => {
    if (!uid) { return; }
    const today = new Date().toISOString().split('T')[0];
    return subscribeToTasksForDate(uid, today, tasks => {
      const count = tasks.filter(t => !t.done && t.poi).length;
      setIncompletePoiCount(count);
    });
  }, [uid]);

  // ── Re-schedule EOD whenever relevant prefs or task count changes ──────────
  useEffect(() => {
    if (loading) { return; }
    scheduleEodReminder({
      enabled:         eodEnabled,
      time:            eodTime,
      incompleteCount: incompletePoiCount,
    }).catch(err => console.warn('[NotifPrefs] scheduleEod error', err));
  }, [eodEnabled, eodTime, incompletePoiCount, loading]);

  // ── Toggle handlers ────────────────────────────────────────────────────────

  const handleEodToggle = useCallback(async (value: boolean) => {
    setPrefs(p => ({ ...p, eodReminder: { enabled: value, time: p.eodReminder?.time ?? eodTime } }));
    try {
      await updateUserPreferences(uid, { eodReminder: { enabled: value, time: eodTime } });
    } catch (err) {
      console.warn('[NotifPrefs] save eodReminder failed', err);
      setPrefs(p => ({ ...p, eodReminder: { enabled: !value, time: eodTime } }));
    }
  }, [uid, eodTime]);

  const handleEodTimeChange = useCallback(async (time: string) => {
    setPrefs(p => ({ ...p, eodReminder: { enabled: eodEnabled, time } }));
    try {
      await updateUserPreferences(uid, { eodReminder: { enabled: eodEnabled, time } });
    } catch (err) {
      console.warn('[NotifPrefs] save eodTime failed', err);
      setPrefs(p => ({ ...p, eodReminder: { enabled: eodEnabled, time: eodTime } }));
    }
  }, [uid, eodEnabled, eodTime]);

  const handleStreakToggle = useCallback(async (value: boolean) => {
    setPrefs(p => ({ ...p, streakReminder: value }));
    try {
      await updateUserPreferences(uid, { streakReminder: value });
    } catch {
      setPrefs(p => ({ ...p, streakReminder: !value }));
    }
  }, [uid]);

  const handleWeeklyToggle = useCallback(async (value: boolean) => {
    setPrefs(p => ({ ...p, weeklyRecap: value }));
    try {
      await updateUserPreferences(uid, { weeklyRecap: value });
    } catch {
      setPrefs(p => ({ ...p, weeklyRecap: !value }));
    }
  }, [uid]);

  const handleReengageToggle = useCallback(async (value: boolean) => {
    setPrefs(p => ({ ...p, reengagementReminders: value }));
    try {
      await updateUserPreferences(uid, { reengagementReminders: value });
    } catch {
      setPrefs(p => ({ ...p, reengagementReminders: !value }));
    }
  }, [uid]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: palette.bg }]}>
        <ActivityIndicator color={palette.muted} accessibilityLabel="Loading preferences" />
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: palette.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: palette.line }]}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <ChevronLeftIcon color={palette.text} size={22} />
        </Pressable>
        <Text style={[s.headerTitle, { color: palette.text }]}>Notifications</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}>

        {/* DAILY */}
        <Section title="DAILY">
          <PrefRow
            Icon={BellIcon}
            label="End-of-day check-in"
            sublabel="Reminds you of any unfinished location tasks."
            value={eodEnabled}
            onToggle={handleEodToggle}
          />
          <TimePickerRow
            selectedTime={eodTime}
            onSelect={handleEodTimeChange}
            isLast
          />
        </Section>

        {/* STREAKS */}
        <Section title="STREAKS">
          <PrefRow
            Icon={BellIcon}
            label="Streak at risk"
            sublabel="Alerts you at 8 PM when your streak is at risk."
            value={streakOn}
            onToggle={handleStreakToggle}
            isLast
          />
        </Section>

        {/* SUMMARY */}
        <Section title="SUMMARY">
          <PrefRow
            Icon={CalendarIcon}
            label="Weekly recap"
            sublabel="Sunday evening summary of your week."
            value={weeklyOn}
            onToggle={handleWeeklyToggle}
            isLast
          />
        </Section>

        {/* ENGAGEMENT */}
        <Section title="ENGAGEMENT">
          <PrefRow
            Icon={BellIcon}
            label="Re-engagement reminders"
            sublabel="A nudge after 3 days away from the app."
            value={reengageOn}
            onToggle={handleReengageToggle}
            isLast
          />
        </Section>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom:     12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width:  40,
    height: 40,
    alignItems:     'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize:   17,
    fontFamily: 'Geist-SemiBold',
    fontWeight: '600',
  },
  content: {
    paddingTop:        24,
    paddingHorizontal: spacing[5],
    gap:               24,
  },
  sectionWrapper: {
    gap: 8,
  },
  sectionLabel: {
    fontSize:      11,
    fontFamily:    'Geist-Medium',
    fontWeight:    '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingLeft:   4,
  },
  card: {
    borderRadius: radius.card,
    borderWidth:  1,
    overflow:     'hidden',
  },
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingVertical:   13,
    gap:               12,
    minHeight:         52,
  },
  iconTile: {
    width:          36,
    height:         36,
    borderRadius:   radius.listIcon,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  rowLabelGroup: {
    flex: 1,
    gap:  2,
  },
  rowLabel: {
    fontSize:   15,
    fontFamily: 'Geist-Regular',
  },
  rowSublabel: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
    lineHeight: 16,
  },
  timeValue: {
    fontSize:    13,
    fontFamily:  'Geist-Regular',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height:     StyleSheet.hairlineWidth,
    marginLeft: 16 + 36 + 12, // align with label start
  },
  timePicker: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  timeOption: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 16 + 36 + 12, // align with label start
    paddingVertical:   13,
  },
  timeOptionText: {
    fontSize:   15,
    fontFamily: 'Geist-Regular',
  },
  timeSelectedDot: {
    width:        7,
    height:       7,
    borderRadius: 9999,
  },
});
