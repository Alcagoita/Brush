import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import PullSpinner from '../../src/screens/TodayScreen/PullSpinner';

jest.mock('../../src/components/LoadingDots', () => {
  const { View } = require('react-native');
  return function MockLoadingDots({ color, size }: { color: string; size: number }) {
    return <View testID="loading-dots" style={{ backgroundColor: color, width: size }} />;
  };
});

describe('PullSpinner', () => {
  it('renders nothing when hidden', () => {
    const { toJSON } = render(
      <PullSpinner
        visible={false}
        top={120}
        color="#e8a86a"
        backgroundColor="#f4f2ed"
        borderColor="#ddd"
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders LoadingDots with the provided color and top position', () => {
    render(
      <PullSpinner
        visible
        top={144}
        color="#d4955a"
        backgroundColor="#232321"
        borderColor="rgba(255,255,255,0.13)"
      />,
    );

    const wrapStyle = StyleSheet.flatten(screen.getByTestId('pull-refresh-loader').props.style);
    const dotsStyle = StyleSheet.flatten(screen.getByTestId('loading-dots').props.style);

    expect(wrapStyle.top).toBe(144);
    expect(dotsStyle.backgroundColor).toBe('#d4955a');
    expect(dotsStyle.width).toBe(7);
  });
});
