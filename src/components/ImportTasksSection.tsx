/**
 * ImportTasksSection — KAN-83
 *
 * "Import tasks" section rendered inside ProfileScreen, below the Notification
 * Preferences card. Shows one import button per source — which sources appear
 * depends on the current platform (Android vs iOS).
 *
 * Flow per button:
 *   idle → loading ("Importing…" + spinner) → result summary  |  error + retry
 *
 * Each source's state is independent: tapping one button does not affect the
 * others. The result summary stays visible until the button is pressed again.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme';
import { spacing, radius as radii } from '../theme/tokens';
import { ImportResult } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: ImportResult }
  | { status: 'error'; message: string };

export type ImportConnector = (uid: string) => Promise<ImportResult>;

interface ImportSource {
  /** Stable key used as React list key and test IDs. */
  key: string;
  label: string;
  connector: ImportConnector;
}

interface Props {
  uid: string;
}

// ─── Platform source definitions ─────────────────────────────────────────────

/**
 * Build the list of import sources for the current platform.
 * Connectors are injected lazily so the service module is not imported at the
 * top level (avoids bundler issues with native-only modules on the wrong platform).
 */
function buildSources(): ImportSource[] {
  if (Platform.OS === 'android') {
    const {
      importFromGoogleTasks,
      importFromGoogleCalendar,
    } = require('../services/import');
    return [
      { key: 'google_tasks',    label: 'Import from Google Tasks',    connector: importFromGoogleTasks    },
      { key: 'google_calendar', label: 'Import from Google Calendar', connector: importFromGoogleCalendar },
    ];
  }
  // iOS
  const {
    importFromReminders,
    importFromCalendar,
  } = require('../services/import');
  return [
    { key: 'eventkit_reminders', label: 'Import from Reminders', connector: importFromReminders },
    { key: 'eventkit_calendar',  label: 'Import from Calendar',  connector: importFromCalendar  },
  ];
}

// ─── Sub-component: one import row ───────────────────────────────────────────

interface RowProps {
  source:  ImportSource;
  uid:     string;
  palette: ReturnType<typeof useTheme>['palette'];
}

function ImportRow({ source, uid, palette }: RowProps) {
  const [state, setState] = useState<ImportState>({ status: 'idle' });

  // Fade animation for the result / error summary
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fadeIn = useCallback(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handlePress = useCallback(async () => {
    if (state.status === 'loading') { return; }
    setState({ status: 'loading' });
    try {
      const result = await source.connector(uid);
      setState({ status: 'success', result });
      fadeIn();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed. Please try again.';
      setState({ status: 'error', message });
      fadeIn();
    }
  }, [state.status, source, uid, fadeIn]);

  const isLoading = state.status === 'loading';

  return (
    <View style={styles.row} accessibilityLabel={`${source.label} row`}>
      {/* Import button */}
      <Pressable
        style={[
          styles.importBtn,
          { borderColor: palette.line },
          isLoading && styles.importBtnLoading,
        ]}
        onPress={handlePress}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel={isLoading ? 'Importing' : source.label}
        accessibilityState={{ busy: isLoading }}>
        {isLoading ? (
          <View style={styles.importBtnInner}>
            <ActivityIndicator
              size="small"
              color={palette.muted}
              accessibilityLabel="Import in progress"
            />
            <Text style={[styles.importBtnText, { color: palette.muted }]}>Importing…</Text>
          </View>
        ) : (
          <Text style={[styles.importBtnText, { color: palette.text }]}>{source.label}</Text>
        )}
      </Pressable>

      {/* Result summary (success) */}
      {state.status === 'success' && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text
            style={[styles.resultText, { color: palette.muted }]}
            accessibilityLabel={`Import result: ${state.result.imported} imported, ${state.result.skipped} skipped, ${state.result.failed} failed`}>
            {state.result.imported} imported · {state.result.skipped} skipped · {state.result.failed} failed
          </Text>
        </Animated.View>
      )}

      {/* Error + retry hint */}
      {state.status === 'error' && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text
            style={[styles.errorText, { color: palette.accent }]}
            accessibilityLabel={`Import error: ${state.message}`}>
            {state.message}
          </Text>
          <Text style={[styles.retryHint, { color: palette.muted }]}>
            Tap the button above to retry.
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ImportTasksSection({ uid }: Props) {
  const { palette } = useTheme();

  // Build sources once per mount — platform doesn't change at runtime.
  const sources = useRef<ImportSource[]>(buildSources()).current;

  return (
    <View
      style={[styles.section, { backgroundColor: palette.surface2 }]}
      accessibilityLabel="Import tasks section">
      {/* Section heading */}
      <Text style={[styles.sectionTitle, { color: palette.muted }]}>
        IMPORT TASKS
      </Text>

      {sources.map((source, index) => (
        <View key={source.key}>
          {index > 0 && (
            <View style={[styles.divider, { backgroundColor: palette.line }]} />
          )}
          <ImportRow source={source} uid={uid} palette={palette} />
        </View>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    borderRadius:      radii.card,
    paddingHorizontal: spacing.page,
    paddingTop:        16,
    paddingBottom:     16,
    gap:               0,
  },

  sectionTitle: {
    fontSize:     13,
    fontWeight:   '500',
    fontFamily:   'Geist-Medium',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  divider: {
    height:         StyleSheet.hairlineWidth,
    marginVertical: 4,
  },

  row: {
    paddingVertical: 8,
    gap:             8,
  },

  importBtn: {
    borderWidth:       1,
    borderRadius:      radii.ctaBtn,
    paddingVertical:   10,
    paddingHorizontal: 16,
    alignItems:        'center',
    justifyContent:    'center',
    minHeight:         40,
  },
  importBtnLoading: {
    opacity: 0.7,
  },
  importBtnInner: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  importBtnText: {
    fontSize:   14,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },

  resultText: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
  },

  errorText: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
  },
  retryHint: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
    marginTop:  2,
  },
});
