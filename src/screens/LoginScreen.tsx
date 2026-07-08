/**
 * LoginScreen — KAN-71
 *
 * Brush brand sign-in screen.
 *
 * Layout (vertically centred column, 28px horizontal padding):
 *   - Logo lockup: "brus" (Geist 600, 62px) + custom SVG "h" + peach dot + pulsing halo
 *   - Tagline
 *   - Form: email, password (Show/Hide, Forgot password), Sign in CTA
 *   - Or divider
 *   - Continue with Google
 *   - Footer sign-up link (pinned bottom)
 *
 * Motion (transform-only, reduce-motion respected):
 *   - Wordmark / tagline / form slide up from +14px
 *   - Dot pops in (scale 0.2 → 1.25 → 1.0)
 *   - Dot halo pulses outward infinitely
 *
 * Rules:
 *   - All colours via useTheme() — no hardcoded values
 *   - Accent colour is peach #e8a86a — no green anywhere
 *   - Geist font throughout
 *   - No Alert.alert — errors shown inline
 *   - Light + dark mode supported automatically
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
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
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../services/auth';
import { logTap } from '../services/analytics';
import { COPY } from '../constants/copy';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOGO_SIZE    = 62;   // px — font-size of "brus" / SVG height
const DOT_SIZE     = 7;    // px — accent dot diameter
const ERROR_COLOR  = '#e05252';
const PAGE_PADDING = 28;

// ─── Google "G" icon (official brand colours) ─────────────────────────────────

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48" style={{ marginRight: 10 }}>
      <Path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.5 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19.1 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.5 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.3C9.6 35.6 16.3 44 24 44z"/>
      <Path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C40.8 36.2 44 30.5 44 24c0-1.3-.1-2.6-.4-3.9z"/>
    </Svg>
  );
}

// ─── Custom "h" glyph (react-native-svg) ─────────────────────────────────────
// viewBox 0 0 72 100, overflow visible, sized to match LOGO_SIZE

interface CustomHProps {
  color: string;
}

function CustomH({ color }: CustomHProps) {
  const sw = LOGO_SIZE * 0.153; // strokeWidth ≈ 9.5px at 62px
  return (
    <Svg
      width={LOGO_SIZE * 0.72}   // natural glyph advance-width
      height={LOGO_SIZE}
      viewBox="0 0 72 100"
      style={{ overflow: 'visible', marginLeft: -(LOGO_SIZE * 0.085) }}>
      {/* Left stem */}
      <Path
        d="M 9 6 L 9 76"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Shoulder + lifting leg */}
      <Path
        d="M 9 40 C 9 30 18 24 30 24 C 42 24 49 31 49 42 L 49 68 C 49 74.5 53.5 77 60 74 C 64 72 66.5 68.5 68 64"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// ─── Animated dot + halo ──────────────────────────────────────────────────────

interface LogoDotProps {
  accentColor: string;
  reducedMotion: boolean;
}

function LogoDot({ accentColor, reducedMotion }: LogoDotProps) {
  // Dot entrance: scale 0.2 → 1.25 → 1.0
  const dotScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.2)).current;
  // Halo: scale 0.5 → 1.9, opacity 0.55 → 0, infinite
  const haloScale   = useRef(new Animated.Value(0.5)).current;
  const haloOpacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    if (reducedMotion) return;

    // Dot pop-in at 850ms
    const dotAnim = Animated.sequence([
      Animated.delay(850),
      Animated.timing(dotScale, {
        toValue: 1.25,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(dotScale, {
        toValue: 1.0,
        duration: 150,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    // Halo loop starts at 1300ms
    const haloLoop = Animated.sequence([
      Animated.delay(1300),
      Animated.loop(
        Animated.parallel([
          Animated.timing(haloScale, {
            toValue: 1.9,
            duration: 2600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity, {
            toValue: 0,
            duration: 2600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ),
    ]);

    dotAnim.start();
    haloLoop.start();

    return () => {
      dotAnim.stop();
      haloLoop.stop();
    };
  }, [reducedMotion, dotScale, haloOpacity, haloScale]);

  const dotRight = -(LOGO_SIZE * 0.05);
  const dotTop   = LOGO_SIZE * 0.30;

  return (
    <View
      style={{
        position: 'absolute',
        right: dotRight,
        top: dotTop,
        width: DOT_SIZE,
        height: DOT_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      pointerEvents="none">
      {/* Halo */}
      <Animated.View
        style={{
          position: 'absolute',
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: DOT_SIZE / 2,
          borderWidth: 1.5,
          borderColor: accentColor,
          opacity: haloOpacity,
          transform: [{ scale: haloScale }],
        }}
      />
      {/* Dot */}
      <Animated.View
        style={{
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: DOT_SIZE / 2,
          backgroundColor: accentColor,
          transform: [{ scale: dotScale }],
        }}
      />
    </View>
  );
}

// ─── Error parsing ────────────────────────────────────────────────────────────

type ErrorField = 'email' | 'password' | 'general';

interface ParsedError {
  field: ErrorField;
  message: string;
}

/** Extracts a Firebase-style `.code` string from an unknown catch value, or ''. */
function errorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) { return ''; }
  const code = (error as { code: unknown }).code;
  return code == null ? '' : String(code);
}

function parseAuthError(code: string, isSignUp: boolean): ParsedError {
  switch (code) {
    case 'auth/invalid-email':
      return { field: 'email', message: COPY.login.errorInvalidEmail };
    case 'auth/user-not-found':
      return { field: 'email', message: COPY.login.errorUserNotFound };
    case 'auth/invalid-credential':
      return { field: 'general', message: COPY.login.errorInvalidCredential };
    case 'auth/wrong-password':
      return { field: 'password', message: COPY.login.errorWrongPassword };
    case 'auth/email-already-in-use':
      return { field: 'email', message: COPY.login.errorEmailInUse };
    case 'auth/weak-password':
      return { field: 'password', message: COPY.login.errorWeakPassword };
    case 'auth/too-many-requests':
      return { field: 'general', message: COPY.login.errorTooManyRequests };
    case 'auth/network-request-failed':
      return { field: 'general', message: COPY.login.errorNetwork };
    default:
      return {
        field: 'general',
        message: isSignUp
          ? COPY.login.errorCreateAccountGeneric
          : COPY.login.errorSignInGeneric,
      };
  }
}

// ─── Field ────────────────────────────────────────────────────────────────────

interface FieldProps {
  label:              string;
  labelRight?:        React.ReactNode;
  value:              string;
  onChange:           (v: string) => void;
  placeholder:        string;
  error?:             string;
  secure?:            boolean;
  keyboardType?:      'default' | 'email-address';
  autoComplete?:      'email' | 'current-password' | 'new-password';
  returnKeyType?:     'next' | 'done';
  onSubmitEditing?:   () => void;
  inputRef?:          React.RefObject<TextInput | null>;
}

function Field({
  label, labelRight, value, onChange, placeholder, error,
  secure = false, keyboardType = 'default', autoComplete,
  returnKeyType = 'done', onSubmitEditing, inputRef,
}: FieldProps) {
  const { palette } = useTheme();
  const [focused,  setFocused]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const borderColor = error
    ? ERROR_COLOR
    : focused
    ? palette.accent
    : palette.line;

  const bgColor = focused ? palette.surface2 : palette.surface;

  return (
    <View style={styles.fieldWrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.fieldLabel, { color: palette.muted }]}>{label}</Text>
        {labelRight}
      </View>

      <View style={[styles.inputWrap, { backgroundColor: bgColor, borderColor }]}>
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
            accessibilityLabel={showPass ? COPY.login.hidePasswordA11y : COPY.login.showPasswordA11y}>
            <Text style={[styles.showHideLabel, { color: palette.muted }]}>
              {showPass ? COPY.login.hidePassword : COPY.login.showPassword}
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

export default function LoginScreen() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [emailError,    setEmailError]    = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError,  setGeneralError]  = useState('');

  const passwordRef = useRef<TextInput>(null);

  // ── Reduce-motion detection ───────────────────────────────────────────────
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => sub.remove();
  }, []);

  // ── Entrance animations ───────────────────────────────────────────────────
  // wordmarkY, taglineY, formY all start at +14, slide to 0
  const wordmarkY = useRef(new Animated.Value(reducedMotion ? 0 : 14)).current;
  const taglineY  = useRef(new Animated.Value(reducedMotion ? 0 : 14)).current;
  const formY     = useRef(new Animated.Value(reducedMotion ? 0 : 14)).current;

  useEffect(() => {
    if (reducedMotion) return;

    const easing = Easing.bezier(0.2, 0.7, 0.3, 1);
    const dur    = 650;

    Animated.stagger(150, [
      Animated.timing(wordmarkY, { toValue: 0, duration: dur, easing, useNativeDriver: true }),
      Animated.timing(taglineY,  { toValue: 0, duration: dur, easing, useNativeDriver: true }),
      Animated.timing(formY,     { toValue: 0, duration: dur, easing, useNativeDriver: true }),
    ]).start();
  }, [reducedMotion, wordmarkY, taglineY, formY]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const clearErrors = () => {
    setEmailError('');
    setPasswordError('');
    setGeneralError('');
  };

  const applyError = (parsed: ParsedError) => {
    if (parsed.field === 'email')    { setEmailError(parsed.message); }
    if (parsed.field === 'password') { setPasswordError(parsed.message); }
    if (parsed.field === 'general')  { setGeneralError(parsed.message); }
  };

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    clearErrors();
    if (!email.trim()) { setEmailError(COPY.login.errorEmailRequired); return; }
    if (!password)     { setPasswordError(COPY.login.errorPasswordRequired); return; }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
      logTap('login', { method: 'email' });
    } catch (error: unknown) {
      applyError(parseAuthError(errorCode(error), isSignUp));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    clearErrors();
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      logTap('login', { method: 'google' });
    } catch (error: unknown) {
      const code = errorCode(error);
      if (code === 'SIGN_IN_CANCELLED' || code === '12501') { return; }
      setGeneralError(COPY.login.errorGoogleSignIn);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleToggleMode = () => { clearErrors(); setIsSignUp(p => !p); };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: palette.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop:    insets.top + 36,
            paddingBottom: insets.bottom + 28,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ── Centred group ── */}
        <View style={styles.centredGroup}>

          {/* ── Logo lockup ── */}
          <Animated.View
            style={[styles.logoLockup, { transform: [{ translateY: wordmarkY }] }]}>
            <View style={styles.logoRow}>
              {/* "brus" text + custom "h" SVG side-by-side, bottom-aligned */}
              <View style={styles.wordmarkRow}>
                <Text style={[styles.wordmark, { color: palette.text }]}>brus</Text>
                <CustomH color={palette.text} />
              </View>
              {/* Dot + halo — positioned relative to the wordmark row */}
              <LogoDot accentColor={palette.accent} reducedMotion={reducedMotion} />
            </View>
          </Animated.View>

          {/* ── Tagline ── */}
          <Animated.View style={{ transform: [{ translateY: taglineY }] }}>
            <Text style={[styles.tagline, { color: palette.muted }]}>
              {COPY.login.tagline}
            </Text>
          </Animated.View>

          {/* ── Form ── */}
          <Animated.View
            style={[styles.form, { transform: [{ translateY: formY }] }]}>

            <Field
              label={COPY.login.emailLabel}
              value={email}
              onChange={v => { setEmail(v); if (emailError) { setEmailError(''); } }}
              placeholder={COPY.login.emailPlaceholder}
              error={emailError}
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <Field
              inputRef={passwordRef}
              label={COPY.login.passwordLabel}
              labelRight={
                <Pressable
                  onPress={() => {/* Forgot password — future KAN */}}
                  accessibilityRole="button"
                  accessibilityLabel={COPY.login.forgotPassword}>
                  <Text style={[styles.forgotLabel, { color: palette.muted }]}>
                    {COPY.login.forgotPassword}
                  </Text>
                </Pressable>
              }
              value={password}
              onChange={v => { setPassword(v); if (passwordError) { setPasswordError(''); } }}
              placeholder={isSignUp ? COPY.login.passwordPlaceholderSignup : COPY.login.passwordPlaceholderSignin}
              error={passwordError}
              secure
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            {/* General error */}
            {generalError ? (
              <View style={[
                styles.generalError,
                { backgroundColor: ERROR_COLOR + '18', borderColor: ERROR_COLOR + '40' },
              ]}>
                <Text style={[styles.generalErrorText, { color: ERROR_COLOR }]}>
                  {generalError}
                </Text>
              </View>
            ) : null}

            {/* Sign in / Create account CTA */}
            <Pressable
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: palette.text },
                (loading || pressed) && styles.ctaPressed,
              ]}
              onPress={handleSubmit}
              disabled={loading || googleLoading}
              accessibilityRole="button"
              accessibilityLabel={isSignUp ? COPY.login.createAccountA11y : COPY.login.signInA11y}>
              {loading ? (
                <ActivityIndicator color={palette.bg} />
              ) : (
                <Text style={[styles.ctaLabel, { color: palette.bg }]}>
                  {isSignUp ? COPY.login.createAccount : COPY.login.signIn}
                </Text>
              )}
            </Pressable>

            {/* Or divider */}
            <View style={styles.dividerWrap}>
              <View style={[styles.dividerLine, { backgroundColor: palette.line }]} />
              <Text style={[styles.dividerLabel, { color: palette.muted }]}>{COPY.login.orDivider}</Text>
              <View style={[styles.dividerLine, { backgroundColor: palette.line }]} />
            </View>

            {/* Continue with Google */}
            <Pressable
              style={({ pressed }) => [
                styles.socialBtn,
                { borderColor: palette.line },
                (googleLoading || pressed) && styles.ctaPressed,
              ]}
              onPress={handleGoogleSignIn}
              disabled={loading || googleLoading}
              accessibilityRole="button"
              accessibilityLabel={COPY.login.continueWithGoogle}>
              {googleLoading ? (
                <ActivityIndicator color={palette.text} />
              ) : (
                <>
                  <GoogleIcon />
                  <Text style={[styles.socialLabel, { color: palette.text }]}>
                    {COPY.login.continueWithGoogle}
                  </Text>
                </>
              )}
            </Pressable>
          </Animated.View>
        </View>

        {/* ── Footer (sign-up link) — pinned at bottom of scroll ── */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleToggleMode}
            accessibilityRole="button">
            <Text style={[styles.footerText, { color: palette.muted }]}>
              {isSignUp ? COPY.login.alreadyHaveAccount : COPY.login.dontHaveAccount}
              <Text style={[styles.footerAction, { color: palette.text }]}>
                {isSignUp ? COPY.login.signInLink : COPY.login.signUpLink}
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
    paddingHorizontal: PAGE_PADDING,
  },

  // ── Centred group ──
  centredGroup: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
  },

  // ── Logo ──
  logoLockup: {
    alignItems:   'center',
    marginBottom: 26,
  },
  logoRow: {
    position: 'relative', // for absolute dot
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems:    'flex-end',
  },
  wordmark: {
    fontSize:      LOGO_SIZE,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
    letterSpacing: LOGO_SIZE * -0.06,
    lineHeight:    LOGO_SIZE * 1.1,   // prevent clipping
    includeFontPadding: false,
  },

  // ── Tagline ──
  tagline: {
    fontSize:      16,
    fontFamily:    'Geist-Regular',
    lineHeight:    16 * 1.5,
    letterSpacing: -0.08,
    textAlign:     'center',
    maxWidth:      270,
    marginBottom:  44,
  },

  // ── Form ──
  form: {
    width: '100%',
    gap:   0,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   8,
  },
  fieldLabel: {
    fontSize:   13,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  forgotLabel: {
    fontSize:   13,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  inputWrap: {
    flexDirection:     'row',
    alignItems:        'center',
    height:            56,
    borderRadius:      15,
    borderWidth:       1,
    paddingHorizontal: 18,
  },
  input: {
    flex:       1,
    fontSize:   16,
    fontFamily: 'Geist-Regular',
    height:     '100%',
    includeFontPadding: false,
  },
  showHideBtn: {
    paddingLeft:     12,
    height:          '100%',
    justifyContent:  'center',
  },
  showHideLabel: {
    fontSize:   14,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  fieldError: {
    marginTop:  6,
    fontSize:   12,
    fontFamily: 'Geist-Regular',
    color:      ERROR_COLOR,
  },

  // ── General error ──
  generalError: {
    borderRadius:      15,
    borderWidth:       1,
    paddingHorizontal: 14,
    paddingVertical:   10,
    marginBottom:      8,
  },
  generalErrorText: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
    lineHeight: 18,
  },

  // ── CTA ──
  cta: {
    height:         56,
    borderRadius:   15,
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      4,
    marginBottom:   20,
  },
  ctaPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  ctaLabel: {
    fontSize:   16,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },

  // ── Divider ──
  dividerWrap: {
    flexDirection:  'row',
    alignItems:     'center',
    marginBottom:   16,
    gap:            14,
  },
  dividerLine: {
    flex:   1,
    height: 1,
  },
  dividerLabel: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },

  // ── Social button ──
  socialBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    height:         56,
    borderRadius:   15,
    borderWidth:    1,
  },
  socialLabel: {
    fontSize:   16,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },

  // ── Footer ──
  footer: {
    alignItems:     'center',
    paddingTop:     20,
    paddingBottom:  28,
  },
  footerText: {
    fontSize:   14.5,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
  },
  footerAction: {
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
});
