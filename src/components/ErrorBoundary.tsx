/**
 * ErrorBoundary — Catches unhandled render errors in child components,
 * reports them to Crashlytics, and shows a friendly recovery screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <YourScreen />
 *   </ErrorBoundary>
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { recordError, logBreadcrumb } from '../services/crashlytics';
import { COPY } from '../constants/copy';
import { lightPalette } from '../theme/tokens';

// ErrorBoundary wraps the whole app above ThemeProvider (App.tsx) so it can
// still render if the provider itself fails — useTheme() isn't safe here,
// so the fallback references lightPalette directly instead of hardcoding hex.
const T = lightPalette;

interface Props {
  children: ReactNode;
  /** Optional custom fallback. Receives a reset callback. */
  fallback?: (reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logBreadcrumb(`ErrorBoundary caught: ${info.componentStack ?? ''}`);
    recordError(error, 'ErrorBoundary.componentDidCatch');
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.handleReset);
      }

      return (
        <View style={styles.container}>
          <Text style={styles.icon}>💥</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={this.handleReset}
            accessibilityRole="button"
            accessibilityLabel={COPY.errorBoundary.tryAgainA11y}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: T.bg,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: T.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: T.muted,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  button: {
    backgroundColor: T.text,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: T.bg,
    fontSize: 15,
    fontWeight: '700',
  },
});
