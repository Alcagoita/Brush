/**
 * UsernameSetupScreen — KAN-97
 *
 * Shown on first sign-up (and for any existing user who has no username).
 * Rendered by AppShell outside the NavigationContainer so it can intercept
 * new users before they reach the main navigator.
 *
 * Flow:
 *   1. User types a username → local format validation only (no API calls)
 *   2. "Continue" → check availability + claim in one shot
 */

import React, { useCallback, useState } from 'react';
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
import { getScreenKeyboardAvoidingBehavior } from '../utils/keyboardAvoiding';
import {
  checkUsernameAvailable,
  claimUsername,
  createUserDocument,
  getUser,
  validateUsername,
} from '../services/firestore';
import { COPY } from '../constants/copy';

interface Props {
  onComplete: () => void;
}

export default function UsernameSetupScreen({ onComplete }: Props) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const [value,        setValue]       = useState('');
  const [validationErr, setValidationErr] = useState<string | null>(null);
  const [submitting,   setSubmitting]  = useState(false);
  const [submitError,  setSubmitError] = useState('');

  // ── Input change — local format validation only, no API calls ───────────────
  const handleChange = useCallback((raw: string) => {
    const v = raw.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setValue(v);
    setSubmitError('');
    setValidationErr(validateUsername(v));
  }, []);

  // ── Submit — availability checked here, once, on tap ───────────────────────
  const canSubmit = !validationErr && value.length >= 3 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) { return; }
    const uid = getAuth().currentUser?.uid;
    if (!uid) { return; }

    setSubmitting(true);
    setSubmitError('');
    try {
      const available = await checkUsernameAvailable(value);
      if (!available) {
        setSubmitError(COPY.usernameSetup.errorTaken(value));
        return;
      }
      // Ensure a complete user document exists before claiming the username.
      // Legacy partial docs (only username/usernameUpdatedAt, missing email/
      // displayName/uid/createdAt) must also be repaired here.
      const existingDoc = await getUser(uid);
      const isComplete = !!(existingDoc?.email && existingDoc?.uid && existingDoc?.createdAt);
      if (!isComplete) {
        const authUser = getAuth().currentUser;
        await createUserDocument(
          uid,
          authUser?.email ?? existingDoc?.email ?? '',
          authUser?.displayName ?? existingDoc?.displayName ?? '',
        );
      }
      await claimUsername(uid, value);
      onComplete();
    } catch {
      setSubmitError(COPY.usernameSetup.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  const borderColor = validationErr && value
    ? palette.danger
    : value && !validationErr
    ? palette.accent
    : palette.line;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: palette.bg }]}
      behavior={getScreenKeyboardAvoidingBehavior()}>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: palette.bg }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.text }]}>{COPY.usernameSetup.title}</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            {COPY.usernameSetup.subtitle}
          </Text>
        </View>

        {/* Input */}
        <View style={styles.inputBlock}>
          <View style={[styles.inputRow, { backgroundColor: palette.surface, borderColor }]}>
            <Text style={[styles.prefix, { color: palette.faint }]}>@</Text>
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder={COPY.usernameSetup.placeholder}
              placeholderTextColor={palette.faint}
              value={value}
              onChangeText={handleChange}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username-new"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              accessibilityLabel={COPY.usernameSetup.inputA11y}
              maxLength={20}
            />
          </View>

          {validationErr && value ? (
            <Text style={[styles.hint, { color: palette.danger }]}>{validationErr}</Text>
          ) : submitError ? (
            <Text style={[styles.hint, { color: palette.danger }]}>{submitError}</Text>
          ) : (
            <Text style={[styles.hint, { color: palette.muted }]}>
              {COPY.usernameSetup.hint}
            </Text>
          )}
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
          accessibilityLabel={COPY.usernameSetup.continueButton}>
          {submitting
            ? <ActivityIndicator color={palette.bg} />
            : (
              <Text style={[styles.ctaLabel, { color: canSubmit ? palette.bg : palette.faint }]}>
                {COPY.usernameSetup.continueButton}
              </Text>
            )
          }
        </Pressable>

        <Text style={[styles.note, { color: palette.faint }]}>
          {COPY.usernameSetup.note}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollView: { flex: 1 },
  content: {
    flexGrow:          1,
    paddingHorizontal: spacing.page,
    gap:               24,
  },
  header: { gap: 10 },
  title: {
    fontSize:      26,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
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
    fontSize:    18,
    fontFamily:  'Geist-Regular',
    marginRight: 2,
  },
  input: {
    flex:               1,
    fontSize:           17,
    fontFamily:         'Geist-Regular',
    height:             '100%',
    includeFontPadding: false,
  },
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
