/**
 * Unit tests for src/screens/LoginScreen.tsx — KAN-71
 *
 * Covers:
 *   - Renders correctly (logo text, tagline, fields, buttons)
 *   - Sign-in / sign-up mode toggle
 *   - Client-side validation: empty email, empty password
 *   - Inline error messages (field-level and general banner)
 *   - Firebase error codes mapped to the correct field
 *   - Loading state while submit is in-flight
 *   - Show / Hide password toggle
 *   - Successful auth calls the correct service function
 *   - Google sign-in handler
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../src/screens/LoginScreen';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSignIn        = jest.fn();
const mockSignUp        = jest.fn();
const mockGoogleSignIn  = jest.fn();

jest.mock('../../src/services/auth', () => ({
  signInWithEmail:  (...args: unknown[]) => mockSignIn(...args),
  signUpWithEmail:  (...args: unknown[]) => mockSignUp(...args),
  signInWithGoogle: (...args: unknown[]) => mockGoogleSignIn(...args),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    dark: false,
    palette: {
      bg:         '#fdfdfb',
      surface:    '#f6f5f1',
      surface2:   '#efeeea',
      line:       'rgba(20,20,18,0.08)',
      text:       '#1a1a18',
      muted:      '#8a8a85',
      faint:      '#bdbdb7',
      ringTrack:  'rgba(20,20,18,0.08)',
      ringFill:   '#1a1a18',
      accent:     '#e8a86a',
      nearTint:   '#fdf7f0',
      nearTint2:  '#f9ede0',
      nearBorder: '#e8c9a0',
      nearText:   '#7a4a20',
    },
  }),
}));

// react-native-svg is a native module — stub it out for Jest
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (props: any) => React.createElement(View, props);
  return {
    __esModule: true,
    default:    stub,
    Svg:        stub,
    Path:       stub,
    Circle:     stub,
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fill email + password and press the named CTA button. */
async function submitForm(email: string, password: string, ctaLabel = 'Sign in') {
  fireEvent.changeText(screen.getByLabelText('Email'),    email);
  fireEvent.changeText(screen.getByLabelText('Password'), password);
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: ctaLabel }));
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Render ────────────────────────────────────────────────────────────────────

describe('LoginScreen — render', () => {
  it('renders the "brus" part of the wordmark', () => {
    render(<LoginScreen />);
    expect(screen.getByText('brus')).toBeTruthy();
  });

  it('renders the tagline', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Brush away your to-dos, as you pass them.')).toBeTruthy();
  });

  it('renders email and password fields', () => {
    render(<LoginScreen />);
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  it('renders the Sign In CTA button', () => {
    render(<LoginScreen />);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });

  it('renders the Continue with Google button', () => {
    render(<LoginScreen />);
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeTruthy();
  });

  it('renders the sign-up footer link', () => {
    render(<LoginScreen />);
    expect(screen.getByText(/Don't have an account/)).toBeTruthy();
  });

  it('does not show any error messages on initial render', () => {
    render(<LoginScreen />);
    expect(screen.queryByText(/Please enter/)).toBeNull();
    expect(screen.queryByText(/Incorrect/)).toBeNull();
    expect(screen.queryByText(/No account/)).toBeNull();
  });
});

// ── Sign-up mode ──────────────────────────────────────────────────────────────

describe('LoginScreen — sign-up mode', () => {
  it('toggles to sign-up mode when the footer link is pressed', () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByRole('button', { name: /Sign up/ }));
    // CTA changes to "Create Account"
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
  });

  it('shows "Already have an account?" in sign-up mode', () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByRole('button', { name: /Sign up/ }));
    expect(screen.getByText(/Already have an account/)).toBeTruthy();
  });

  it('clears errors when toggling mode', () => {
    render(<LoginScreen />);
    // Trigger a validation error first
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Please enter your email address.')).toBeTruthy();
    // Toggle mode — error should clear
    fireEvent.press(screen.getByRole('button', { name: /Sign up/ }));
    expect(screen.queryByText('Please enter your email address.')).toBeNull();
  });
});

// ── Client-side validation ────────────────────────────────────────────────────

describe('LoginScreen — client-side validation', () => {
  it('shows an email error when email is empty on submit', () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Please enter your email address.')).toBeTruthy();
  });

  it('does not call signInWithEmail when email is empty', () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows a password error when password is empty on submit', () => {
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByLabelText('Email'), 'user@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Please enter your password.')).toBeTruthy();
  });

  it('clears the email error when the user starts typing', () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Please enter your email address.')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Email'), 'a');
    expect(screen.queryByText('Please enter your email address.')).toBeNull();
  });

  it('clears the password error when the user starts typing', () => {
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByLabelText('Email'), 'user@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Please enter your password.')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Password'), 'x');
    expect(screen.queryByText('Please enter your password.')).toBeNull();
  });
});

// ── Firebase error mapping ────────────────────────────────────────────────────

describe('LoginScreen — Firebase error mapping', () => {
  function makeAuthError(code: string) {
    const err = new Error(code) as any;
    err.code = code;
    return err;
  }

  it('shows email error for auth/invalid-email', async () => {
    mockSignIn.mockRejectedValueOnce(makeAuthError('auth/invalid-email'));
    render(<LoginScreen />);
    await submitForm('bad-email', 'password123');
    await waitFor(() =>
      expect(screen.getByText('Please enter a valid email address.')).toBeTruthy(),
    );
  });

  it('shows email error for auth/user-not-found', async () => {
    mockSignIn.mockRejectedValueOnce(makeAuthError('auth/user-not-found'));
    render(<LoginScreen />);
    await submitForm('ghost@example.com', 'password123');
    await waitFor(() =>
      expect(screen.getByText('No account found with this email.')).toBeTruthy(),
    );
  });

  it('shows general error for auth/invalid-credential', async () => {
    mockSignIn.mockRejectedValueOnce(makeAuthError('auth/invalid-credential'));
    render(<LoginScreen />);
    await submitForm('user@example.com', 'wrongpass');
    await waitFor(() =>
      expect(screen.getByText('Invalid email or password. Please check your credentials.')).toBeTruthy(),
    );
  });

  it('shows password error for auth/wrong-password', async () => {
    mockSignIn.mockRejectedValueOnce(makeAuthError('auth/wrong-password'));
    render(<LoginScreen />);
    await submitForm('user@example.com', 'wrongpass');
    await waitFor(() =>
      expect(screen.getByText('Incorrect password. Please try again.')).toBeTruthy(),
    );
  });

  it('shows email error for auth/email-already-in-use (sign-up)', async () => {
    mockSignUp.mockRejectedValueOnce(makeAuthError('auth/email-already-in-use'));
    render(<LoginScreen />);
    fireEvent.press(screen.getByRole('button', { name: /Sign up/ }));
    await submitForm('taken@example.com', 'password123', 'Create account');
    await waitFor(() =>
      expect(screen.getByText('An account already exists with this email.')).toBeTruthy(),
    );
  });

  it('shows password error for auth/weak-password (sign-up)', async () => {
    mockSignUp.mockRejectedValueOnce(makeAuthError('auth/weak-password'));
    render(<LoginScreen />);
    fireEvent.press(screen.getByRole('button', { name: /Sign up/ }));
    await submitForm('new@example.com', '123', 'Create account');
    await waitFor(() =>
      expect(screen.getByText('Password must be at least 6 characters.')).toBeTruthy(),
    );
  });

  it('shows general banner for auth/too-many-requests', async () => {
    mockSignIn.mockRejectedValueOnce(makeAuthError('auth/too-many-requests'));
    render(<LoginScreen />);
    await submitForm('user@example.com', 'password123');
    await waitFor(() =>
      expect(screen.getByText('Too many attempts. Please wait a moment and try again.')).toBeTruthy(),
    );
  });

  it('shows general banner for auth/network-request-failed', async () => {
    mockSignIn.mockRejectedValueOnce(makeAuthError('auth/network-request-failed'));
    render(<LoginScreen />);
    await submitForm('user@example.com', 'password123');
    await waitFor(() =>
      expect(screen.getByText('Network error — check your connection.')).toBeTruthy(),
    );
  });

  it('shows a generic general banner for unknown error codes', async () => {
    mockSignIn.mockRejectedValueOnce(makeAuthError('auth/unknown-error'));
    render(<LoginScreen />);
    await submitForm('user@example.com', 'password123');
    await waitFor(() =>
      expect(screen.getByText('Sign in failed. Please try again.')).toBeTruthy(),
    );
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('LoginScreen — loading state', () => {
  it('disables the CTA while a request is in-flight', async () => {
    let resolve!: () => void;
    mockSignIn.mockReturnValueOnce(new Promise<void>(r => { resolve = r; }));
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByLabelText('Email'),    'user@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    const btn = screen.getByRole('button', { name: 'Sign in' });
    expect(btn.props.accessibilityState?.disabled).toBe(true);

    await act(async () => { resolve(); });
  });

  it('re-enables the CTA after an error is returned', async () => {
    mockSignIn.mockRejectedValueOnce({ code: 'auth/wrong-password' });
    render(<LoginScreen />);
    await submitForm('user@example.com', 'password123');
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: 'Sign in' });
      expect(btn.props.accessibilityState?.disabled).toBeFalsy();
    });
  });
});

// ── Password show / hide ──────────────────────────────────────────────────────

describe('LoginScreen — show/hide password', () => {
  it('password field is secure by default', () => {
    render(<LoginScreen />);
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
  });

  it('pressing "Show" reveals the password', () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
  });

  it('pressing "Hide" conceals the password again', () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
    fireEvent.press(screen.getByRole('button', { name: 'Hide password' }));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
  });
});

// ── Successful auth ───────────────────────────────────────────────────────────

describe('LoginScreen — successful auth', () => {
  it('calls signInWithEmail with trimmed email and password', async () => {
    mockSignIn.mockResolvedValueOnce(undefined);
    render(<LoginScreen />);
    await submitForm('  user@example.com  ', 'mypassword');
    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith('user@example.com', 'mypassword'),
    );
  });

  it('calls signUpWithEmail in sign-up mode', async () => {
    mockSignUp.mockResolvedValueOnce(undefined);
    render(<LoginScreen />);
    fireEvent.press(screen.getByRole('button', { name: /Sign up/ }));
    fireEvent.changeText(screen.getByLabelText('Email'),    'new@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'newpassword');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    });
    await waitFor(() =>
      expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'newpassword'),
    );
  });
});

// ── Google sign-in ────────────────────────────────────────────────────────────

describe('LoginScreen — Google sign-in', () => {
  it('calls signInWithGoogle when the Google button is pressed', async () => {
    mockGoogleSignIn.mockResolvedValueOnce(undefined);
    render(<LoginScreen />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    });
    await waitFor(() => expect(mockGoogleSignIn).toHaveBeenCalledTimes(1));
  });

  it('shows a general error banner when Google sign-in fails', async () => {
    mockGoogleSignIn.mockRejectedValueOnce({ code: 'auth/unknown' });
    render(<LoginScreen />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    });
    await waitFor(() =>
      expect(screen.getByText('Google sign-in failed. Please try again.')).toBeTruthy(),
    );
  });

  it('shows no error when Google sign-in is cancelled (SIGN_IN_CANCELLED)', async () => {
    mockGoogleSignIn.mockRejectedValueOnce({ code: 'SIGN_IN_CANCELLED' });
    render(<LoginScreen />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    });
    await waitFor(() =>
      expect(screen.queryByText('Google sign-in failed. Please try again.')).toBeNull(),
    );
  });
});
