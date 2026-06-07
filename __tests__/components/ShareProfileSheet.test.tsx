/**
 * ShareProfileSheet — KAN-115
 *
 * Covers:
 *   - Renders nothing when visible=false
 *   - Renders sheet content when visible=true
 *   - Displays displayName, @username, and totalPoints in the mini-card
 *   - Copy link calls Clipboard.setString and shows "Copied!" label
 *   - Copy label resets after 2.5s
 *   - Message and More tiles call Share.share
 *   - QR code tile does not call Share.share (placeholder)
 *   - Close button calls onClose
 *   - Scrim press calls onClose
 */

import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Share } from 'react-native';
import ShareProfileSheet from '../../src/components/ShareProfileSheet';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg: '#fff', surface: '#f6f5f1', surface2: '#efeeea',
      text: '#000', muted: '#999', faint: '#ccc',
      line: 'rgba(20,20,18,0.08)', accent: '#e8a86a',
      nearTint: '#fdf7f0', nearTint2: '#f9ede0',
      nearBorder: '#e8c9a0', nearText: '#7a4a20',
    },
  }),
}));

jest.mock('../../src/theme/tokens', () => ({
  radius:  { card: 16, listIcon: 10, chip: 9999 },
  spacing: { page: 22 },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../src/components/Avatar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ accessibilityLabel }: { accessibilityLabel?: string }) =>
    <View accessibilityLabel={accessibilityLabel ?? 'avatar'} />;
});

// Mock all AppIcon exports used in ShareProfileSheet
jest.mock('../../src/components/AppIcon', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const mock = (name: string) => () => <Text>{name}</Text>;
  return {
    CheckIcon:   mock('CheckIcon'),
    CloseIcon:   mock('CloseIcon'),
    CopyIcon:    mock('CopyIcon'),
    GridIcon:    mock('GridIcon'),
    MessageIcon: mock('MessageIcon'),
    QrCodeIcon:  mock('QrCodeIcon'),
    StarIcon:    mock('StarIcon'),
  };
});

const mockSetString = jest.fn();
jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: { setString: (...args: unknown[]) => mockSetString(...args) },
}));

let mockShare: jest.SpyInstance;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const defaultProps = {
  visible:     true,
  onClose:     jest.fn(),
  displayName: 'Jane Doe',
  username:    'janedoe',
  totalPoints: 42,
  photoURL:    null,
};

function Wrapper({ initialVisible = true }: { initialVisible?: boolean }) {
  const [visible, setVisible] = useState(initialVisible);
  return (
    <ShareProfileSheet
      {...defaultProps}
      visible={visible}
      onClose={() => setVisible(false)}
    />
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ShareProfileSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockShare = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Visibility ──────────────────────────────────────────────────────────────

  it('renders nothing when visible=false', () => {
    render(<ShareProfileSheet {...defaultProps} visible={false} />);
    expect(screen.queryByText('Share my profile')).toBeNull();
  });

  it('renders sheet content when visible=true', () => {
    render(<ShareProfileSheet {...defaultProps} />);
    expect(screen.getByText('Share my profile')).toBeTruthy();
  });

  // ── Profile mini-card ───────────────────────────────────────────────────────

  it('shows displayName in the mini-card', () => {
    render(<ShareProfileSheet {...defaultProps} displayName="Jane Doe" />);
    expect(screen.getByText('Jane Doe')).toBeTruthy();
  });

  it('shows @username in the mini-card', () => {
    render(<ShareProfileSheet {...defaultProps} username="janedoe" />);
    expect(screen.getByText('@janedoe')).toBeTruthy();
  });

  it('omits username line when username is undefined', () => {
    render(<ShareProfileSheet {...defaultProps} username={undefined} />);
    expect(screen.queryByText(/@/)).toBeNull();
  });

  it('shows totalPoints in the points pill', () => {
    render(<ShareProfileSheet {...defaultProps} totalPoints={42} />);
    expect(screen.getByText('42 pts')).toBeTruthy();
  });

  // ── Targets ─────────────────────────────────────────────────────────────────

  it('renders all four target tiles', () => {
    render(<ShareProfileSheet {...defaultProps} />);
    expect(screen.getByText('Copy link')).toBeTruthy();
    expect(screen.getByText('Message')).toBeTruthy();
    expect(screen.getByText('QR code')).toBeTruthy();
    expect(screen.getByText('More')).toBeTruthy();
  });

  // ── Copy link ───────────────────────────────────────────────────────────────

  it('calls Clipboard.setString with the profile URL on Copy link tap', () => {
    render(<ShareProfileSheet {...defaultProps} username="janedoe" />);
    fireEvent.press(screen.getByLabelText('Copy link'));
    expect(mockSetString).toHaveBeenCalledWith('https://brushaway.app/u/janedoe');
  });

  it('shows "Copied!" label immediately after copy', () => {
    render(<ShareProfileSheet {...defaultProps} />);
    fireEvent.press(screen.getByLabelText('Copy link'));
    expect(screen.getByText('Copied!')).toBeTruthy();
  });

  it('resets copy label back to "Copy link" after 2.5s', () => {
    render(<ShareProfileSheet {...defaultProps} />);
    fireEvent.press(screen.getByLabelText('Copy link'));
    expect(screen.getByText('Copied!')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(2500); });
    expect(screen.getByText('Copy link')).toBeTruthy();
  });

  // ── Share actions ───────────────────────────────────────────────────────────

  it('calls Share.share when Message tile is pressed', async () => {
    render(<ShareProfileSheet {...defaultProps} username="janedoe" />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Share via message'));
    });
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://brushaway.app/u/janedoe' }),
    );
  });

  it('calls Share.share when More tile is pressed', async () => {
    render(<ShareProfileSheet {...defaultProps} username="janedoe" />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('More sharing options'));
    });
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://brushaway.app/u/janedoe' }),
    );
  });

  it('does NOT call Share.share when QR code tile is pressed', async () => {
    render(<ShareProfileSheet {...defaultProps} />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Show QR code (coming soon)'));
    });
    expect(mockShare).not.toHaveBeenCalled();
  });

  // ── Dismiss ─────────────────────────────────────────────────────────────────

  it('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    render(<ShareProfileSheet {...defaultProps} onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the scrim is pressed', () => {
    const onClose = jest.fn();
    render(<ShareProfileSheet {...defaultProps} onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Close sheet'));
    expect(onClose).toHaveBeenCalled();
  });

  // ── Copy timeout reset on close ─────────────────────────────────────────────

  it('resets copied state when sheet is closed mid-timeout', () => {
    render(<Wrapper initialVisible />);
    fireEvent.press(screen.getByLabelText('Copy link'));
    expect(screen.getByText('Copied!')).toBeTruthy();
    // Close the sheet (triggers visible=false → timeout cleared)
    fireEvent.press(screen.getByLabelText('Close'));
    // Even after 2.5s, no dangling state update error
    act(() => { jest.advanceTimersByTime(2500); });
  });
});
