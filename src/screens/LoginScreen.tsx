/**
 * LoginScreen — KAN-48
 *
 * Vibe Agenda design system login screen.
 *
 * Layout (top → bottom, vertically centred):
 *   - App icon + wordmark + tagline
 *   - Email field   (surface2 bg, line border, inline error)
 *   - Password field (surface2 bg, show/hide toggle, inline error)
 *   - General error message
 *   - Primary CTA (text bg, bg text) with loading state
 *   - Sign-in ↔ Sign-up toggle link
 *
 * Rules:
 *   - All colours via useTheme() — no hardcoded values
 *   - Geist font throughout
 *   - No Alert.alert — errors shown inline below the relevant field
 *   - Light + dark mode supported automatically
 */

import React, { useRef, useState } from 'react';
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
import { useTheme } from '../theme';
import { spacing, radius } from '../theme/tokens';
import { signInWithEmail, signUpWithEmail } from '../services/auth';

// ─── Error parsing ────────────────────────────────────────────────────────────

type ErrorField = 'email' | 'password' | 'general';

interface ParsedError {
  field:   ErrorField;
  message: string;
}

function parseAuthError(code: string, isSignUp: boolean): ParsedError {
  switch (code) {
    case 'auth/invalid-email':
      return { field: 'email', message: 'Please enter a valid email address.' };
    case 'auth/user-not-found':
      return { field: 'email', message: 'No account found with this email.' };
    case 'auth/invalid-credential':
      // Firebase v9+ returns this for both wrong password AND unknown email
      // to prevent account enumeration. Use a neutral message.
      return { field: 'general', message: 'Invalid email or password. Please check your credentials.' };
    case 'auth/wrong-password':
      return { field: 'password', message: 'Incorrect password. Please try again.' };
    case 'auth/email-already-in-use':
      return { field: 'email', message: 'An account already exists with this email.' };
    case 'auth/weak-password':
      return { field: 'password', message: 'Password must be at least 6 characters.' };
    case 'auth/too-many-requests':
      return { field: 'general', message: 'Too many attempts. Please wait a moment and try again.' };
    case 'auth/network-request-failed':
      return { field: 'general', message: 'Network error — check your connection.' };
    default:
      return {
        field:   'general',
        message: isSignUp
          ? 'Could not create account. Please try again.'
          : 'Sign in failed. Please try again.',
      };
  }
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

interface FieldProps {
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  placeholder: string;
  error?:      string;
  secure?:     boolean;
  keyboardType?: 'default' | 'email-address';
  autoComplete?: 'email' | 'current-password' | 'new-password';
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
}

function Field({
  label, value, onChange, placeholder, error,
  secure = false, keyboardType = 'default', autoComplete,
  returnKeyType = 'done', onSubmitEditing, inputRef,
}: FieldProps) {
  const { palette } = useTheme();
  const [focused,   setFocused]   = useState(false);
  const [showPass,  setShowPass]  = useState(false);

  const borderColor = error
    ? ERROR_COLOR
    : focused
    ? palette.text
    : palette.line;

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: palette.muted }]}>{label}</Text>

      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: palette.surface2,
            borderColor,
          },
        ]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: palette.text }]}
          placeholder={placeholder}
          placeholderTextColor={palette.faint}
          value={value}
          onChangeText={onChange}
          autoCapitalize="none"
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          secureTextEntry={secure && !showPass}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
        />
        {secure && (
          <Pressable
            onPress={() => setShowPass(p => !p)}
            style={styles.showHideBtn}
            accessibilityRole="button"
            accessibilityLabel={showPass ? 'Hide password' : 'Show password'}>
            <Text style={[styles.showHideLabel, { color: palette.muted }]}>
              {showPass ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        )}
      </View>

      {error ? (
        <Text style={styles.fieldError} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const ERROR_COLOR = '#e05252';

export default function LoginScreen() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const [emailError,    setEmailError]    = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError,  setGeneralError]  = useState('');

  const passwordRef = useRef<TextInput>(null);

  const clearErrors = () => {
    setEmailError('');
    setPasswordError('');
    setGeneralError('');
  };

  const handleSubmit = async () => {
    clearErrors();

    // Client-side validation
    if (!email.trim()) {
      setEmailError('Please enter your email address.');
      return;
    }
    if (!password) {
      setPasswordError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
      // Auth state change in useAuth() handles navigation automatically
    } catch (error: any) {
      const code    = error?.code ?? '';
      const parsed  = parseAuthError(code, isSignUp);
      if (parsed.field === 'email')    { setEmailError(parsed.message); }
      if (parsed.field === 'password') { setPasswordError(parsed.message); }
      if (parsed.field === 'general')  { setGeneralError(parsed.message); }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    clearErrors();
    setIsSignUp(p => !p);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: palette.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ── Wordmark ── */}
        <View style={styles.brand}>
          <Text style={[styles.wordmark, { color: palette.text }]}>Agenda</Text>
          <Text style={[styles.tagline, { color: palette.muted }]}>
            {isSignUp ? 'Create your account' : 'Sign in to continue'}
          </Text>
        </View>

        {/* ── Form ── */}
        <View style={styles.form}>
          <Field
            label="Email"
            value={email}
            onChange={v => { setEmail(v); if (emailError) { setEmailError(''); } }}
            placeholder="you@example.com"
            error={emailError}
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <Field
            inputRef={passwordRef}
            label="Password"
            value={password}
            onChange={v => { setPassword(v); if (passwordError) { setPasswordError(''); } }}
            placeholder={isSignUp ? 'Min. 6 characters' : '••••••••'}
            error={passwordError}
            secure
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {/* General error */}
          {generalError ? (
            <View style={[styles.generalError, { backgroundColor: ERROR_COLOR + '18', borderColor: ERROR_COLOR + '40' }]}>
              <Text style={[styles.generalErrorText, { color: ERROR_COLOR }]}>
                {generalError}
              </Text>
            </View>
          ) : null}

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: palette.text },
              (loading || pressed) && styles.ctaPressed,
            ]}
            onPress={handleSubmit}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={isSignUp ? 'Create account' : 'Sign in'}>
            {loading ? (
              <ActivityIndicator color={palette.bg} />
            ) : (
              <Text style={[styles.ctaLabel, { color: palette.bg }]}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </Pressable>

          {/* Toggle sign-in / sign-up */}
          <Pressable
            onPress={handleToggleMode}
            style={styles.toggleWrap}
            accessibilityRole="button">
            <Text style={[styles.toggleText, { color: palette.muted }]}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <Text style={[styles.toggleAction, { color: palette.text }]}>
                {isSignUp ? 'Sign in' : 'Sign up'}
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow:          1,
    paddingHorizontal: spacing.page,
    justifyContent:    'center',
  },

  // ── Brand ──
  brand: {
    alignItems:   'center',
    marginBottom: 48,
  },
  wordmark: {
    fontSize:      36,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
    letterSpacing: -0.5,
    marginBottom:  6,
  },
  tagline: {
    fontSize:   15,
    fontFamily: 'Geist-Regular',
  },

  // ── Form ──
  form: {
    gap: 4,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize:      12,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
    letterSpacing:  0.4,
    marginBottom:   6,
  },
  inputWrap: {
    flexDirection:   'row',
    alignItems:      'center',
    borderRadius:    radius.ctaBtn,
    borderWidth:     1,
    paddingHorizontal: 16,
  },
  input: {
    flex:            1,
    fontSize:        15,
    fontFamily:      'Geist-Regular',
    paddingVertical: 14,
  },
  showHideBtn: {
    paddingLeft: 12,
    paddingVertical: 14,
  },
  showHideLabel: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },
  fieldError: {
    marginTop:  6,
    fontSize:   12,
    fontFamily: 'Geist-Regular',
    color:      ERROR_COLOR,
  },

  // ── General error ──
  generalError: {
    borderRadius:    radius.ctaBtn,
    borderWidth:     1,
    paddingHorizontal: 14,
    paddingVertical:   10,
    marginBottom:      4,
  },
  generalErrorText: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
    lineHeight: 18,
  },

  // ── CTA ──
  cta: {
    borderRadius:    radius.ctaBtn,
    paddingVertical: 16,
    alignItems:      'center',
    marginTop:       8,
    marginBottom:    20,
  },
  ctaPressed: {
    opacity: 0.82,
  },
  ctaLabel: {
    fontSize:   16,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },

  // ── Toggle ──
  toggleWrap: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleText: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
  },
  toggleAction: {
    fontWeight: '500',
    fontFamily: 'Geist-Regular',
  },
});
