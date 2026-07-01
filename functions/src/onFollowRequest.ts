/**
 * onFollowRequest — KAN-221
 *
 * Firestore trigger that fires when a follow_request entry is created under
 * users/{uid}/inbox/{entryId} (written client-side by followUser(), which is
 * rules-guarded by an existsAfter check on the corresponding followers doc —
 * see firestore.rules). Writes the corresponding pendingNotifications entry
 * server-side so the recipient's device fires a local notifee notification.
 *
 * This replaces the client's direct write to pendingNotifications/{followedUid}
 * (KAN-98/212), which allowed any authenticated user to spoof a "follow"
 * notification into an arbitrary user's mailbox with no proof a follow ever
 * happened. Because this function only reacts to an inbox entry that already
 * passed the existsAfter(followers) rule check, the notification can no
 * longer be forged.
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

export interface FollowRequestData {
  type:            string;
  fromUid:         string;
  fromUsername?:   string;
  fromDisplayName: string;
}

/** Builds the pendingNotification payload for a new follow_request. */
export function buildFollowNotification(data: FollowRequestData) {
  const handle = data.fromUsername ? `@${data.fromUsername}` : data.fromDisplayName;
  return {
    type:      'follow' as const,
    sentBy:    data.fromUid,
    title:     `${handle} started following you`,
    body:      'Tap to see their profile',
    data:      { type: 'follow', fromUid: data.fromUid, screen: 'SharedTaskInbox' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

export const onFollowRequest = onDocumentCreated(
  'users/{uid}/inbox/{entryId}',
  async (event) => {
    const data = event.data?.data() as FollowRequestData | undefined;
    if (!data || data.type !== 'follow_request') { return; }

    const followedUid = event.params.uid;
    const db = admin.firestore();

    // Deterministic ID mirrors the pre-KAN-221 client convention — prevents
    // duplicate notifications on function retries.
    await db
      .collection('pendingNotifications').doc(followedUid)
      .collection('items').doc(`follow_${data.fromUid}`)
      .set(buildFollowNotification(data));
  },
);
