/**
 * SettingsScreen — KAN-113
 *
 * Sections:
 *   TASKS            — Manage Categories, Notification Preferences (dynamic count)
 *   APPEARANCE       — Dark mode toggle
 *   LOCATION & BATTERY — Pause nearby alerts on low battery toggle
 *   IMPORT TASKS     — per-platform import sources (tap-to-import, inline state)
 *   ACCOUNT          — Sign out (danger)
 *
 * Footer: "Brush Away · v{APP_VERSION}" (faint, 12px)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  subscribeLowBatteryPausePref,
  setLowBatteryPausePref,
  subscribeStoreTuningPref,
  setStoreTuningPref,
} from '../services/firestore';
import { logout } from '../services/auth';
import {
  BatteryIcon,
  BellIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GridIcon,
  ListCheckIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
} from '../components/AppIcon';
import { RootStackParamList } from '../navigation/AppNavigator';
import { ImportResult } from '../types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const APP_VERSION: string = require('../../package.json').version;

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ImportConnector = (uid: string) => Promise<ImportResult>;

interface ImportSource {
  key:       string;
  label:     string;
  Icon:      React.FC<{ color: string; size?: number }>;
  connector: ImportConnector;
}

type ImportStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; result: ImportResult }
  | { kind: 'error'; message: string };


// ─── Import row ───────────────────────────────────────────────────────────────

interface ImportRowProps {
  source: ImportSource;
  uid:    string;
  isLast: boolean;
}

function ImportRow({ source, uid, isLast }: ImportRowProps) {
  const { palette } = useTheme();
  const [status, setStatus] = useState<ImportStatus>({ kind: 'idle' });

  const handlePress = useCallback(async () => {
    if (status.kind === 'loading') { return; }
    setStatus({ kind: 'loading' });
    try {
      const result = await source.connector(uid);
      setStatus({ kind: 'success', result });
    } catch {
      setStatus({ kind: 'error', message: 'Import failed. Please try again.' });
    }
  }, [status.kind, source, uid]);

  const isLoading = status.kind === 'loading';
  const { Icon } = source;

  let trailing: React.ReactNode;
  if (isLoading) {
    trailing = (
      <ActivityIndicator
        size="small"
        color={palette.muted}
        accessibilityLabel="Import in progress"
      />
    );
  } else if (status.kind === 'success') {
    trailing = (
      <Text style={[s.trailingText, { color: palette.muted }]}>
        {status.result.imported} imported
      </Text>
    );
  } else if (status.kind === 'error') {
    trailing = (
      <Text style={[s.trailingText, { color: palette.accent }]}>
        Failed · retry
      </Text>
    );
  } else {
    trailing = <ChevronRightIcon color={palette.faint} size={16} />;
  }

  return (
    <>
      <Pressable
        style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}
        onPress={handlePress}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel={source.label}
        accessibilityState={{ busy: isLoading }}>
        <View style={[s.iconTile, { backgroundColor: palette.surface2 }]}>
          <Icon color={palette.muted} size={19} />
        </View>
        <Text style={[s.rowLabel, { color: palette.text }]}>{source.label}</Text>
        <View style={s.trailingSlot}>{trailing}</View>
      </Pressable>
      {!isLast && <View style={[s.divider, { backgroundColor: palette.line }]} />}
    </>
  );
}

// ─── Generic settings row ─────────────────────────────────────────────────────

interface SettingsRowProps {
  Icon:     React.FC<{ color: string; size?: number }>;
  label:    string;
  /** Optional secondary line of text below the label. */
  sublabel?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  danger?:  boolean;
  isLast?:  boolean;
  accessibilityLabel?: string;
}

function SettingsRow({
  Icon,
  label,
  sublabel,
  onPress,
  trailing,
  danger = false,
  isLast = false,
  accessibilityLabel,
}: SettingsRowProps) {
  const { palette } = useTheme();
  const textColor = danger ? palette.accent : palette.text;

  return (
    <>
      <Pressable
        style={({ pressed }) => [s.row, pressed && onPress && { opacity: 0.6 }]}
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : 'none'}
        accessibilityLabel={accessibilityLabel ?? label}>
        <View style={[s.iconTile, { backgroundColor: palette.surface2 }]}>
          <Icon color={danger ? palette.accent : palette.muted} size={19} />
        </View>
        <View style={s.rowLabelGroup}>
          <Text style={[s.rowLabel, { color: textColor }]}>{label}</Text>
          {sublabel ? (
            <Text style={[s.rowSublabel, { color: palette.muted }]} numberOfLines={2}>
              {sublabel}
            </Text>
          ) : null}
        </View>
        <View style={s.trailingSlot}>
          {trailing !== undefined
            ? trailing
            : onPress && <ChevronRightIcon color={palette.faint} size={16} />}
        </View>
      </Pressable>
      {!isLast && <View style={[s.divider, { backgroundColor: palette.line }]} />}
    </>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={s.sectionWrapper}>
      <Text style={[s.sectionLabel, { color: palette.muted }]}>{title}</Text>
      <View style={[s.card, { backgroundColor: palette.surface }]}>{children}</View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { palette, dark, setDark } = useTheme();
  const navigation = useNavigation<Nav>();
  const insets     = useSafeAreaInsets();

  const uid = getAuth().currentUser?.uid ?? '';

  const [lowBatteryPause,    setLowBatteryPause]    = useState(false);
  const [storeTuningEnabled, setStoreTuningEnabled] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!uid) { return; }
    const unsubPause   = subscribeLowBatteryPausePref(uid, setLowBatteryPause);
    const unsubTuning  = subscribeStoreTuningPref(uid, setStoreTuningEnabled);
    return () => { unsubPause(); unsubTuning(); };
  }, [uid]);

  const handleDarkToggle = useCallback((value: boolean) => {
    setDark(value);
  }, [setDark]);

  const handleLowBatteryToggle = useCallback(async (value: boolean) => {
    setLowBatteryPause(value);
    try {
      await setLowBatteryPausePref(uid, value);
    } catch {
      setLowBatteryPause(!value);
    }
  }, [uid]);

  const handleStoreTuningToggle = useCallback(async (value: boolean) => {
    setStoreTuningEnabled(value);
    try {
      await setStoreTuningPref(uid, value);
    } catch {
      setStoreTuningEnabled(!value);
    }
  }, [uid]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ],
    );
  }, []);

  const importSources = useRef<ImportSource[]>((() => {
    if (Platform.OS === 'android') {
      const { importFromGoogleTasks, importFromGoogleCalendar } = require('../services/import');
      return [
        { key: 'google_tasks',    label: 'Google Tasks',    Icon: ListCheckIcon, connector: importFromGoogleTasks    },
        { key: 'google_calendar', label: 'Google Calendar', Icon: CalendarIcon,  connector: importFromGoogleCalendar },
      ];
    }
    const { importFromReminders, importFromCalendar } = require('../services/import');
    return [
      { key: 'eventkit_reminders', label: 'Reminders', Icon: ListCheckIcon, connector: importFromReminders },
      { key: 'eventkit_calendar',  label: 'Calendar',  Icon: CalendarIcon,  connector: importFromCalendar  },
    ];
  })()).current;

  const AppearanceIcon = dark ? MoonIcon : SunIcon;

  return (
    <View style={[s.root, { backgroundColor: palette.bg }]}>
      {/* Header */}
      <View
        style={[
          s.header,
          { paddingTop: insets.top + 8, borderBottomColor: palette.line },
        ]}>
        <Pressable
          style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.6 }]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <ChevronLeftIcon color={palette.text} size={22} />
        </Pressable>
        <Text style={[s.headerTitle, { color: palette.text }]}>Settings</Text>
        {/* balance the back button so title centers */}
        <View style={s.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}>

        {/* TASKS */}
        <Section title="TASKS">
          <SettingsRow
            Icon={GridIcon}
            label="Manage Categories"
            onPress={() => navigation.navigate('Categories')}
            accessibilityLabel="Manage Categories"
          />
          <SettingsRow
            Icon={BellIcon}
            label="Notification Preferences"
            onPress={() => navigation.navigate('NotificationPreferences')}
            isLast
            accessibilityLabel="Notification Preferences"
          />
        </Section>

        {/* APPEARANCE */}
        <Section title="APPEARANCE">
          <SettingsRow
            Icon={AppearanceIcon}
            label="Dark mode"
            isLast
            trailing={
              <Switch
                value={dark}
                onValueChange={handleDarkToggle}
                trackColor={{ false: palette.surface2, true: palette.accent }}
                thumbColor={palette.bg}
                accessibilityLabel="Dark mode toggle"
              />
            }
          />
        </Section>

        {/* LOCATION & BATTERY */}
        <Section title="LOCATION & BATTERY">
          <SettingsRow
            Icon={BatteryIcon}
            label="Pause nearby alerts on low battery"
            trailing={
              <Switch
                value={lowBatteryPause}
                onValueChange={handleLowBatteryToggle}
                trackColor={{ false: palette.surface2, true: palette.accent }}
                thumbColor={palette.bg}
                accessibilityLabel="Pause nearby alerts on low battery toggle"
              />
            }
          />
          <SettingsRow
            Icon={BuildingIcon}
            label="Store fine tuning"
            sublabel="Automatically switch to store-level proximity when inside a mall. Uses more battery."
            isLast
            trailing={
              <Switch
                value={storeTuningEnabled === true}
                onValueChange={handleStoreTuningToggle}
                trackColor={{ false: palette.surface2, true: palette.accent }}
                thumbColor={palette.bg}
                accessibilityLabel="Store fine tuning toggle"
              />
            }
          />
        </Section>

        {/* IMPORT TASKS */}
        <Section title="IMPORT TASKS">
          {importSources.map((src, idx) => (
            <ImportRow
              key={src.key}
              source={src}
              uid={uid}
              isLast={idx === importSources.length - 1}
            />
          ))}
        </Section>

        {/* ACCOUNT */}
        <Section title="ACCOUNT">
          <SettingsRow
            Icon={LogOutIcon}
            label="Sign out"
            onPress={handleSignOut}
            danger
            isLast
            accessibilityLabel="Sign out"
          />
        </Section>

        <Text style={[s.footer, { color: palette.faint }]}>
          Brush Away · v{APP_VERSION}
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.page,
    paddingBottom:     12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width:          36,
    height:         36,
    alignItems:     'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize:   17,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },

  scroll: {
    paddingTop: 20,
    gap:        16,
  },

  sectionWrapper: {
    gap: 6,
  },
  sectionLabel: {
    fontSize:          12,
    fontWeight:        '500',
    fontFamily:        'Geist-Medium',
    letterSpacing:     0.5,
    paddingHorizontal: spacing.page + 6,
  },
  card: {
    borderRadius:     radius.card,
    marginHorizontal: spacing.page,
    overflow:         'hidden',
  },

  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingVertical:   10,
    minHeight:         52,
    gap:               12,
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
    flex:    1,
    gap:     2,
    minWidth: 0,
  },
  rowLabel: {
    flex:       1,     // expands in ImportRow (no rowLabelGroup wrapper)
    fontSize:   15,
    fontWeight: '400',
    fontFamily: 'Geist-Regular',
  },
  rowSublabel: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
    lineHeight: 16,
  },
  trailingSlot: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  trailingGroup: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  trailingText: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },

  divider: {
    height:     StyleSheet.hairlineWidth,
    marginLeft: 16 + 36 + 12, // align with label start
  },

  footer: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
    marginTop:  8,
  },
});
