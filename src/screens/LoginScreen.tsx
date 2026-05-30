/**
 * LoginScreen — KAN-48
 *
 * Brush design system login screen.
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
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme';
import { spacing, radius } from '../theme/tokens';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple } from '../services/auth';

// ─── Google icon (official brand colours, no hardcoded theme colours) ─────────

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48" style={{ marginRight: 10 }}>
      <Path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.5 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19.1 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.5 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.3C9.6 35.6 16.3 44 24 44z"/>
      <Path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C40.8 36.2 44 30.5 44 24c0-1.3-.1-2.6-.4-3.9z"/>
    </Svg>
  );
}

// ─── Apple icon (monochrome — adapts to light/dark via fill prop) ─────────────

function AppleIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 814 1000" style={{ marginRight: 10 }}>
      <Path fill={color} d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 484.5 7.9 351.5 7.9 223.1c0-171.9 112.3-262.7 221.2-262.7 65.7 0 120.7 43.4 162.2 43.4 39.8 0 102.1-46.2 177.8-46.2 28.8 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
    </Svg>
  );
}

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
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading,  setAppleLoading]  = useState(false);

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

  const handleAppleSignIn = async () => {
    clearErrors();
    setAppleLoading(true);
    try {
      await signInWithApple();
      // Auth state change in useAuth() handles navigation automatically
    } catch (error: any) {
      const code = error?.code ?? '';
      if (code === '1001' || code === 'ERR_CANCELED') {
        // User cancelled — no error message needed
        return;
      }
      setGeneralError('Apple sign-in failed. Please try again.');
    } finally {
      setAppleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    clearErrors();
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Auth state change in useAuth() handles navigation automatically
    } catch (error: any) {
      const code = error?.code ?? '';
      if (code === 'SIGN_IN_CANCELLED' || code === '12501') {
        // User dismissed the picker — no error message needed
        return;
      }
      setGeneralError('Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
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
          <Text style={[styles.wordmark, { color: palette.text }]}>Brush</Text>
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

          {/* ── Divider ── */}
          <View style={styles.dividerWrap}>
            <View style={[styles.dividerLine, { backgroundColor: palette.line }]} />
            <Text style={[styles.dividerLabel, { color: palette.muted }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: palette.line }]} />
          </View>

          {/* ── Google Sign-In ── */}
          <Pressable
            style={({ pressed }) => [
              styles.socialBtn,
              { borderColor: palette.line, backgroundColor: palette.surface },
              (googleLoading || pressed) && styles.ctaPressed,
            ]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || loading || appleLoading}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google">
            {googleLoading ? (
              <ActivityIndicator color={palette.text} />
            ) : (
              <>
                <GoogleIcon />
                <Text style={[styles.socialLabel, { color: palette.text }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>

          {/* ── Apple Sign-In (iOS only) ── */}
          {Platform.OS === 'ios' && (
            <Pressable
              style={({ pressed }) => [
                styles.socialBtn,
                { borderColor: palette.line, backgroundColor: palette.surface },
                (appleLoading || pressed) && styles.ctaPressed,
              ]}
              onPress={handleAppleSignIn}
              disabled={appleLoading || loading || googleLoading}
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple">
              {appleLoading ? (
                <ActivityIndicator color={palette.text} />
              ) : (
                <>
                  <AppleIcon color={palette.text} />
                  <Text style={[styles.socialLabel, { color: palette.text }]}>
                    Continue with Apple
                  </Text>
                </>
              )}
            </Pressable>
          )}
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

  // ── Divider ──
  dividerWrap: {
    flexDirection:  'row',
    alignItems:     'center',
    marginVertical: 16,
    gap:            10,
  },
  dividerLine: {
    flex:   1,
    height: 1,
  },
  dividerLabel: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },

  // ── Social buttons (Google / Apple) ──
  socialBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    borderRadius:    radius.ctaBtn,
    borderWidth:     1,
    paddingVertical: 14,
    marginBottom:    8,
  },
  socialLabel: {
    fontSize:   15,
    fontWeight: '500',
    fontFamily: 'Geist-Regular',
  },
});
