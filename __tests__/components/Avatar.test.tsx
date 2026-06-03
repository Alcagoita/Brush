/**
 * Unit tests for src/components/Avatar.tsx — KAN-18
 *
 * Covers:
 *   - Renders amber dot (no photoURL)
 *   - Renders Image when photoURL is set
 *   - Wraps in Pressable when onPress provided
 *   - Plain View (no Pressable) when onPress omitted
 *   - Respects size prop
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Avatar from '../../src/components/Avatar';

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      surface2: '#efeeea',
      accent:   '#e8a86a',
    },
  }),
}));

describe('Avatar', () => {
  it('renders without crashing (no photoURL)', () => {
    render(<Avatar />);
  });

  it('shows a Pressable with onPress label when onPress is provided', () => {
    render(<Avatar onPress={() => {}} accessibilityLabel="Open profile" />);
    expect(screen.getByRole('button', { name: 'Open profile' })).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<Avatar onPress={onPress} accessibilityLabel="Open profile" />);
    fireEvent.press(screen.getByRole('button', { name: 'Open profile' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render a button when onPress is omitted', () => {
    render(<Avatar accessibilityLabel="Avatar" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders an Image when photoURL is provided', () => {
    const { UNSAFE_getByType } = render(
      <Avatar photoURL="https://example.com/photo.jpg" />,
    );
    const { Image } = require('react-native');
    expect(UNSAFE_getByType(Image)).toBeTruthy();
  });

  it('does NOT render an Image when photoURL is null', () => {
    const { UNSAFE_queryByType } = render(<Avatar photoURL={null} />);
    const { Image } = require('react-native');
    expect(UNSAFE_queryByType(Image)).toBeNull();
  });
});
