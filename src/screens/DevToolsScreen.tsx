/**
 * DevToolsScreen — developer utilities, only reachable in __DEV__ builds.
 *
 * Provides buttons to verify Crashlytics integration without waiting for
 * a real crash to happen in production.
 */
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getCrashlytics, crash, log, recordError, setAttribute } from '@react-native-firebase/crashlytics';
import { useTheme } from '../theme';

// Deliberate fixed terminal palette for the diagnostic log console below —
// a raw black/lime console readout, not themed brand UI (dev-only, __DEV__ gated).
/* eslint-disable no-restricted-syntax -- documented exception, see comment above */
const TERMINAL = {
  bg:    '#1a1a2e',
  title: '#6b7280',
  line:  '#a3e635',
};
/* eslint-enable no-restricted-syntax */

export default function DevToolsScreen() {
  const { palette } = useTheme();
  const [log_output, setLog] = useState<string[]>([]);

  function addLog(msg: string) {
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  }

  function handleForceCrash() {
    Alert.alert(
      'Force Crash',
      'This will crash the app immediately to test Crashlytics. The crash report will appear in the Firebase Console within a few minutes after restarting the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Crash now',
          style: 'destructive',
          onPress: () => {
            log(getCrashlytics(), 'Force crash triggered from DevToolsScreen');
            crash(getCrashlytics());
          },
        },
      ],
    );
  }

  function handleNonFatalError() {
    try {
      throw new Error('Test non-fatal error from DevToolsScreen');
    } catch (e) {
      recordError(getCrashlytics(), e as Error, 'DevToolsScreen test');
      addLog('Non-fatal error recorded');
      Alert.alert('Recorded', 'Non-fatal error sent to Crashlytics. Check the Firebase Console.');
    }
  }

  function handleLogBreadcrumb() {
    const msg = `Dev breadcrumb at ${new Date().toISOString()}`;
    log(getCrashlytics(), msg);
    addLog(`Breadcrumb logged: "${msg}"`);
  }

  function handleSetAttribute() {
    setAttribute(getCrashlytics(), 'test_key', 'dev_value');
    addLog('Custom attribute set: test_key=dev_value');
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: palette.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.heading, { color: palette.text }]}>Developer Tools</Text>
      <Text style={[styles.subheading, { color: palette.muted }]}>Crashlytics</Text>

      <TouchableOpacity
        style={[styles.button, { borderColor: palette.danger, backgroundColor: palette.danger + '14' }]}
        onPress={handleForceCrash}>
        <Text style={[styles.buttonText, { color: palette.text }]}>Force Crash</Text>
        <Text style={[styles.buttonHint, { color: palette.muted }]}>Confirms crash reporting works end-to-end</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: palette.surface, borderColor: palette.line }]}
        onPress={handleNonFatalError}>
        <Text style={[styles.buttonText, { color: palette.text }]}>Record Non-Fatal Error</Text>
        <Text style={[styles.buttonHint, { color: palette.muted }]}>Sends a non-fatal error without crashing</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: palette.surface, borderColor: palette.line }]}
        onPress={handleLogBreadcrumb}>
        <Text style={[styles.buttonText, { color: palette.text }]}>Log Breadcrumb</Text>
        <Text style={[styles.buttonHint, { color: palette.muted }]}>Appends a message to the crash timeline</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: palette.surface, borderColor: palette.line }]}
        onPress={handleSetAttribute}>
        <Text style={[styles.buttonText, { color: palette.text }]}>Set Custom Attribute</Text>
        <Text style={[styles.buttonHint, { color: palette.muted }]}>Sets test_key=dev_value on the session</Text>
      </TouchableOpacity>

      {log_output.length > 0 && (
        <View style={[styles.logBox, { backgroundColor: TERMINAL.bg }]}>
          <Text style={[styles.logTitle, { color: TERMINAL.title }]}>Output</Text>
          {log_output.map((line, i) => (
            <Text key={i} style={[styles.logLine, { color: TERMINAL.line }]}>{line}</Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  buttonHint: {
    fontSize: 12,
  },
  logBox: {
    marginTop: 24,
    borderRadius: 12,
    padding: 16,
  },
  logTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  logLine: {
    fontSize: 11,
    fontFamily: 'Courier',
    marginBottom: 4,
  },
});
