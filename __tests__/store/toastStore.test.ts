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
});
