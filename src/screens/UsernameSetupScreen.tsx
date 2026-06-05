/**
 * UsernameSetupScreen — KAN-97
 *
 * Shown on first sign-up (and for any existing user who has no username).
 * Rendered by AppShell outside the NavigationContainer so it can intercept
 * new users before they reach the main navigator.
 *
 * Flow:
 *   1. User types a username → real-time validation + debounced uniqueness check
 *   2. "Continue" → claimUsername → onComplete() → AppShell renders the app
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import {
  checkUsernameAvailable,
  claimUsername,
  validateUsername,
} from '../services/firestore';

const ERROR_COLOR    = '#e05252';
const SUCCESS_COLOR  = '#4caf7d';
const DEBOUNCE_MS    = 450;

interface Props {
  onComplete: () => void;
}

export default function UsernameSetupScreen({ onComplete }: Props) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const [value,        setValue]        = useState('');
  const [validationErr, setValidationErr] = useState<string | null>(null);
  const [available,    setAvailable]    = useState<boolean | null>(null);
  const [checking,     setChecking]     = useState(false);
  const [checkError,   setCheckError]   = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Input change ────────────────────────────────────────────────────────────
  const handleChange = useCallback((raw: string) => {
    const v = raw.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setValue(v);
    setSubmitError('');
    setAvailable(null);
    setCheckError(false);

    const err = validateUsername(v);
    setValidationErr(err);
    if (err) { setChecking(false); return; }

    // Debounce uniqueness check
    if (debounceRef.current) { clearTimeout(debounceRef.current); }
    setChecking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const ok = await checkUsernameAvailable(v);
        setAvailable(ok);
        setCheckError(false);
      } catch {
        setAvailable(null);
        setCheckError(true);
      } finally {
        setChecking(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => () => { if (debounceRef.current) { clearTimeout(debounceRef.current); } }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────
  // Allow submission when available=true OR when the check errored (server
  // will reject the write if the name is already taken).
  const canSubmit = !validationErr && (available === true || checkError) && !checking && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) { return; }
    const uid = getAuth().currentUser?.uid;
    if (!uid) { return; }
    setSubmitting(true);
    try {
      await claimUsername(uid, value);
      onComplete();
    } catch {
      setSubmitError('Failed to save username. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Status hint ─────────────────────────────────────────────────────────────
  const statusText = (() => {
    if (!value) { return null; }
    if (validationErr) { return null; }
    if (checking) { return 'Checking…'; }
    if (checkError) { return 'Could not check availability — tap Continue to retry'; }
    if (available === true)  { return '@' + value + ' is available'; }
    if (available === false) { return 'Username already taken'; }
    return null;
  })();

  const statusColor = available === true
    ? SUCCESS_COLOR
    : available === false || checkError
    ? ERROR_COLOR
    : palette.muted;

  const borderColor = value && !validationErr
    ? available === true
      ? SUCCESS_COLOR
      : available === false
      ? ERROR_COLOR
      : palette.accent
    : palette.line;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: palette.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.text }]}>Choose a username</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            Your unique handle for sharing tasks and connecting with friends.
          </Text>
        </View>

        {/* Input */}
        <View style={styles.inputBlock}>
          <View style={[styles.inputRow, { backgroundColor: palette.surface, borderColor }]}>
            <Text style={[styles.prefix, { color: palette.faint }]}>@</Text>
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="yourhandle"
              placeholderTextColor={palette.faint}
              value={value}
              onChangeText={handleChange}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username-new"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              accessibilityLabel="Username"
              maxLength={20}
            />
            {checking && (
              <ActivityIndicator size="small" color={palette.muted} style={styles.spinner} />
            )}
          </View>

          {/* Validation error */}
          {validationErr ? (
            <Text style={[styles.hint, { color: ERROR_COLOR }]}>{validationErr}</Text>
          ) : statusText ? (
            <Text style={[styles.hint, { color: statusColor }]}>{statusText}</Text>
          ) : (
            <Text style={[styles.hint, { color: palette.muted }]}>
              3–20 chars · letters, numbers, underscores only
            </Text>
          )}

          {submitError ? (
            <Text style={[styles.hint, { color: ERROR_COLOR, marginTop: 4 }]}>{submitError}</Text>
          ) : null}
        </View>

        {/* CTA */}
        <Pressable
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: canSubmit ? palette.text : palette.surface2 },
            (pressed && canSubmit) && { opacity: 0.82, transform: [{ scale: 0.985 }] },
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="Continue">
          {submitting
            ? <ActivityIndicator color={palette.bg} />
            : (
              <Text style={[styles.ctaLabel, { color: canSubmit ? palette.bg : palette.faint }]}>
                Continue
              </Text>
            )
          }
        </Pressable>

        <Text style={[styles.note, { color: palette.faint }]}>
          You can change your username once every 30 days.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flexGrow:          1,
    paddingHorizontal: spacing.page,
    gap:               24,
  },
  header: { gap: 10 },
  title: {
    fontSize:   26,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize:   15,
    fontFamily: 'Geist-Regular',
    lineHeight: 22,
  },
  inputBlock: { gap: 8 },
  inputRow: {
    flexDirection:     'row',
    alignItems:        'center',
    height:            56,
    borderRadius:      radius.ctaBtn,
    borderWidth:       1,
    paddingHorizontal: 16,
  },
  prefix: {
    fontSize:   18,
    fontFamily: 'Geist-Regular',
    marginRight: 2,
  },
  input: {
    flex:       1,
    fontSize:   17,
    fontFamily: 'Geist-Regular',
    height:     '100%',
    includeFontPadding: false,
  },
  spinner: { marginLeft: 8 },
  hint: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
    lineHeight: 18,
  },
  cta: {
    height:         56,
    borderRadius:   radius.ctaBtn,
    alignItems:     'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontSize:   16,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
  note: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
    lineHeight: 18,
  },
});
