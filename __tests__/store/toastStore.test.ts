/**
 * KAN-149 — toastStore unit tests.
 */

import { useToastStore } from '../../src/store/toastStore';

beforeEach(() => {
  useToastStore.setState({ message: null });
});

describe('toastStore', () => {
  it('starts with no message', () => {
    expect(useToastStore.getState().message).toBeNull();
  });

  it('showToast sets the message', () => {
    useToastStore.getState().showToast('Hello');
    expect(useToastStore.getState().message).toBe('Hello');
  });

  it('showToast overwrites a previous message', () => {
    useToastStore.getState().showToast('First');
    useToastStore.getState().showToast('Second');
    expect(useToastStore.getState().message).toBe('Second');
  });

  it('hideToast clears the message', () => {
    useToastStore.getState().showToast('Hello');
    useToastStore.getState().hideToast();
    expect(useToastStore.getState().message).toBeNull();
  });

  it('hideToast is a no-op when already null', () => {
    expect(() => useToastStore.getState().hideToast()).not.toThrow();
    expect(useToastStore.getState().message).toBeNull();
  });

  // KAN-244 — actionable toast
  it('showToast with an action stores it', () => {
    const onPress = jest.fn();
    useToastStore.getState().showToast('Show me', { label: 'Show me', onPress });
    expect(useToastStore.getState().action).toEqual({ label: 'Show me', onPress });
  });

  it('showToast without an action clears any previous one', () => {
    useToastStore.getState().showToast('First', { label: 'Go', onPress: jest.fn() });
    useToastStore.getState().showToast('Second');
    expect(useToastStore.getState().action).toBeNull();
  });

  it('hideToast clears the action', () => {
    useToastStore.getState().showToast('Show me', { label: 'Go', onPress: jest.fn() });
    useToastStore.getState().hideToast();
    expect(useToastStore.getState().action).toBeNull();
  });
});
