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

export default function DevToolsScreen() {
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Developer Tools</Text>
      <Text style={styles.subheading}>Crashlytics</Text>

      <TouchableOpacity style={[styles.button, styles.danger]} onPress={handleForceCrash}>
        <Text style={styles.buttonText}>Force Crash</Text>
        <Text style={styles.buttonHint}>Confirms crash reporting works end-to-end</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleNonFatalError}>
        <Text style={styles.buttonText}>Record Non-Fatal Error</Text>
        <Text style={styles.buttonHint}>Sends a non-fatal error without crashing</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleLogBreadcrumb}>
        <Text style={styles.buttonText}>Log Breadcrumb</Text>
        <Text style={styles.buttonHint}>Appends a message to the crash timeline</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleSetAttribute}>
        <Text style={styles.buttonText}>Set Custom Attribute</Text>
        <Text style={styles.buttonHint}>Sets test_key=dev_value on the session</Text>
      </TouchableOpacity>

      {log_output.length > 0 && (
        <View style={styles.logBox}>
          <Text style={styles.logTitle}>Output</Text>
          {log_output.map((line, i) => (
            <Text key={i} style={styles.logLine}>{line}</Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  danger: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff5f5',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  buttonHint: {
    fontSize: 12,
    color: '#6b7280',
  },
  logBox: {
    marginTop: 24,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
  },
  logTitle: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  logLine: {
    color: '#a3e635',
    fontSize: 11,
    fontFamily: 'Courier',
    marginBottom: 4,
  },
});
