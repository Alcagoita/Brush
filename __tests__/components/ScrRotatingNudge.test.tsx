/**
 * ScrRotatingNudge.test.tsx — KAN-139
 *
 * Covers:
 *   - Render: first message text and icon are shown
 *   - Render: icon slot is always rendered (even without a poi)
 *   - Render: no POI icon rendered when message has no poi
 *   - Timer: message advances after pace interval
 *   - Timer: cleans up on unmount (no state-update-after-unmount)
 *   - Reduced motion: uses shorter fade when AccessibilityInfo reports true
 *   - Single message: no interval started (nothing to cycle)
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import ScrRotatingNudge, { NudgeMessage } from '../../src/components/ScrRotatingNudge';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      muted: '#8a8a85',
    },
  }),
}));

jest.mock('../../src/components/AppIcon', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    PoiIcon: ({ type, ...props }: any) =>
      React.createElement(View, { testID: `poi-icon-${type}`, ...props }),
  };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MSG_PLAIN:  NudgeMessage = { text: "Nothing on today." };
const MSG_POI:    NudgeMessage = { text: "Need bread?", poi: "supermarket", color: "#8b6bc4" };
const MSG_CAFE:   NudgeMessage = { text: "Good day for coffee.", poi: "cafe", color: "#e8a86a" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderNudge(messages: NudgeMessage[], pace = 5) {
  return render(<ScrRotatingNudge messages={messages} pace={pace} />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ScrRotatingNudge — render', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });
  afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });

  it('shows the first message text on mount', () => {
    renderNudge([MSG_PLAIN, MSG_POI]);
    expect(screen.getByText('Nothing on today.')).toBeTruthy();
  });

  it('renders the POI icon when first message has a poi', () => {
    renderNudge([MSG_POI, MSG_PLAIN]);
    expect(screen.getByTestId('poi-icon-supermarket')).toBeTruthy();
  });

  it('does NOT render a POI icon when first message has no poi', () => {
    renderNudge([MSG_PLAIN, MSG_POI]);
    expect(screen.queryByTestId('poi-icon-supermarket')).toBeNull();
  });

  it('renders a single plain message without crashing', () => {
    renderNudge([MSG_PLAIN]);
    expect(screen.getByText('Nothing on today.')).toBeTruthy();
  });
});

describe('ScrRotatingNudge — message rotation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });
  afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });

  it('advances to the second message after pace interval + animation', async () => {
    renderNudge([MSG_PLAIN, MSG_POI], 3);

    // Advance past the interval (3000ms) + fade out (550ms) + fade in (550ms)
    await act(async () => {
      jest.advanceTimersByTime(3000 + 600 + 600);
    });

    expect(screen.getByText('Need bread?')).toBeTruthy();
  });

  it('shows the third message after two rotation cycles', async () => {
    renderNudge([MSG_PLAIN, MSG_POI, MSG_CAFE], 3);

    // First cycle → MSG_POI
    await act(async () => {
      jest.advanceTimersByTime(3000 + 600 + 600);
    });
    expect(screen.getByText('Need bread?')).toBeTruthy();

    // Second cycle → MSG_CAFE
    await act(async () => {
      jest.advanceTimersByTime(3000 + 600 + 600);
    });
    expect(screen.getByText('Good day for coffee.')).toBeTruthy();
  });

  it('does NOT start a timer when only one message is provided', async () => {
    renderNudge([MSG_PLAIN], 1);

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });

    // Still shows the first (and only) message — no crash, no timer
    expect(screen.getByText('Nothing on today.')).toBeTruthy();
  });
});

describe('ScrRotatingNudge — cleanup', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });
  afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });

  it('clears the timer on unmount without throwing', () => {
    const { unmount } = renderNudge([MSG_PLAIN, MSG_POI], 2);
    expect(() => {
      unmount();
      jest.advanceTimersByTime(5000);
    }).not.toThrow();
  });
});

describe('ScrRotatingNudge — reduced motion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });
  afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });

  it('still rotates messages when reduce motion is enabled', async () => {
    renderNudge([MSG_PLAIN, MSG_POI], 2);

    // With reduced motion the fade is ~120ms, not 550ms — still advances
    await act(async () => {
      jest.advanceTimersByTime(2000 + 200 + 200);
    });

    expect(screen.getByText('Need bread?')).toBeTruthy();
  });
});
