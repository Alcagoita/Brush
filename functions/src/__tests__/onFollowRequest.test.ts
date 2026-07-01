/**
 * KAN-221 — onFollowRequest helpers unit tests
 *
 * Tests buildFollowNotification in isolation. The Firestore trigger itself
 * (onFollowRequest) is exercised against the Firebase emulator in
 * integration tests.
 */

import { buildFollowNotification } from '../onFollowRequest';

describe('buildFollowNotification', () => {
  it('uses @username as the handle when available', () => {
    const payload = buildFollowNotification({
      type: 'follow_request', fromUid: 'uid-a', fromUsername: 'alice', fromDisplayName: 'Alice',
    });
    expect(payload.title).toBe('@alice started following you');
  });

  it('falls back to displayName when no username is set', () => {
    const payload = buildFollowNotification({
      type: 'follow_request', fromUid: 'uid-a', fromDisplayName: 'Alice',
    });
    expect(payload.title).toBe('Alice started following you');
  });

  it('sets type=follow and sentBy=fromUid', () => {
    const payload = buildFollowNotification({
      type: 'follow_request', fromUid: 'uid-a', fromDisplayName: 'Alice',
    });
    expect(payload.type).toBe('follow');
    expect(payload.sentBy).toBe('uid-a');
  });

  it('includes fromUid and screen in data', () => {
    const payload = buildFollowNotification({
      type: 'follow_request', fromUid: 'uid-a', fromDisplayName: 'Alice',
    });
    expect(payload.data).toEqual({ type: 'follow', fromUid: 'uid-a', screen: 'SharedTaskInbox' });
  });

  it('sets a createdAt sentinel', () => {
    const payload = buildFollowNotification({
      type: 'follow_request', fromUid: 'uid-a', fromDisplayName: 'Alice',
    });
    expect(payload.createdAt).toBeDefined();
  });
});
