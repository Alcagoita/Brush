/**
 * src/services/sharing.ts — KAN-86 / KAN-87
 *
 * In-app task sharing: send a task to another Brush user.
 *
 * Send flow (KAN-86):
 *   1. findUserByEmail()   — exact-match email lookup in Firestore
 *   2. sendSharedTask()    — writes to sharedTasks/{recipientUid}/incoming
 *                          — writes a pendingNotification so the recipient
 *                            device shows a local notifee notification (KAN-87)
 *
 * Receive flow (KAN-87):
 *   subscribeToIncomingSharedTasks()   — real-time listener for the inbox
 *   acceptSharedTask()                 — copies task into recipient's collection
 *   declineSharedTask()                — removes from incoming
 *
 * Notification delivery:
 *   The app writes a pendingNotifications/{recipientUid}/items/{id} document.
 *   The recipient's device (KAN-87) subscribes to that collection and fires a
 *   local notifee notification when a new item arrives. This works while the
 *   app is foregrounded or backgrounded with an active Firestore connection.
 *   For true background push (app killed), a Firebase Cloud Function listening
 *   to sharedTasks writes can call the FCM HTTP v1 API — that is a future
 *   infrastructure addition outside this ticket's scope.
 */

import {
  getFirestore,
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from '@react-native-firebase/firestore';
import { Task, SharedTask, PendingNotification } from '../types';

// ─── User lookup ──────────────────────────────────────────────────────────────

export interface UserSummary {
  uid:         string;
  displayName: string;
  email:       string;
}

/**
 * Find a Brush user by exact email address (case-insensitive via lowercase).
 * Returns null if no user is found.
 */
export async function findUserByEmail(email: string): Promise<UserSummary | null> {
  const normalised = email.trim().toLowerCase();
  if (!normalised) { return null; }

  const snap = await getDocs(
    query(
      collection(getFirestore(), 'users'),
      where('email', '==', normalised),
    ),
  );

  if (snap.empty) { return null; }

  const data = snap.docs[0].data();
  return {
    uid:         snap.docs[0].id,
    displayName: data.displayName ?? 'Brush user',
    email:       data.email ?? normalised,
  };
}

// ─── Send ─────────────────────────────────────────────────────────────────────

export interface SendSharedTaskParams {
  senderUid:      string;
  senderName:     string;
  recipientUid:   string;
  recipientName:  string;
  task:           Task;
}

/**
 * Write the shared task record and a pending notification document.
 * Returns the ID of the created incoming record.
 */
export async function sendSharedTask(params: SendSharedTaskParams): Promise<string> {
  const { senderUid, senderName, recipientUid, recipientName, task } = params;

  if (senderUid === recipientUid) {
    throw new Error('CANNOT_SEND_TO_SELF');
  }

  const db = getFirestore();

  // 1. Write the shared task to the recipient's inbox.
  const incomingRef = await addDoc(
    collection(db, 'sharedTasks', recipientUid, 'incoming'),
    {
      taskId:     task.id,
      title:      task.title,
      category:   task.category,
      ...(task.poi ? { poi: task.poi } : {}),
      sentBy:     senderUid,
      sentByName: senderName,
      sentAt:     serverTimestamp(),
      status:     'pending',
    } satisfies Omit<SharedTask, 'id'>,
  );

  // 2. Write a pending-notification document so the recipient's device
  //    (KAN-87 subscription) can trigger a local notifee notification.
  await addDoc(
    collection(db, 'pendingNotifications', recipientUid, 'items'),
    {
      type:      'shared_task',
      title:     `${senderName} sent you a task`,
      body:      task.title,
      data: {
        type:           'shared_task',
        sharedTaskId:   incomingRef.id,
        recipientUid,
      },
      createdAt: serverTimestamp(),
    } satisfies Omit<PendingNotification, 'id'>,
  );

  return incomingRef.id;
}

// ─── Receive (KAN-87) ─────────────────────────────────────────────────────────

/**
 * Real-time subscription to the recipient's shared-task inbox.
 * Returns an unsubscribe function.
 */
export function subscribeToIncomingSharedTasks(
  uid: string,
  onNext: (tasks: SharedTask[]) => void,
  onError: (err: Error) => void,
): () => void {
  return onSnapshot(
    query(
      collection(getFirestore(), 'sharedTasks', uid, 'incoming'),
      where('status', '==', 'pending'),
    ),
    { includeMetadataChanges: false },
    snap => {
      const tasks: SharedTask[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<SharedTask, 'id'>),
      }));
      onNext(tasks);
    },
    onError,
  );
}

/**
 * Accept a shared task: copy it into the recipient's own task collection
 * and remove it from incoming.
 */
export async function acceptSharedTask(
  recipientUid: string,
  shared: SharedTask,
): Promise<void> {
  const db  = getFirestore();
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  await addDoc(
    collection(db, 'users', recipientUid, 'tasks'),
    {
      title:     shared.title,
      category:  shared.category,
      ...(shared.poi ? { poi: shared.poi } : {}),
      done:      false,
      date:      dateStr,
      createdAt: serverTimestamp(),
    },
  );

  await deleteDoc(
    doc(db, 'sharedTasks', recipientUid, 'incoming', shared.id),
  );
}

/**
 * Decline a shared task: remove it from incoming with no further action.
 */
export async function declineSharedTask(
  recipientUid: string,
  sharedTaskId: string,
): Promise<void> {
  await deleteDoc(
    doc(getFirestore(), 'sharedTasks', recipientUid, 'incoming', sharedTaskId),
  );
}

/**
 * Subscribe to pending notifications for a user. Fires the callback with
 * each new notification document, then deletes it after delivery.
 * Returns an unsubscribe function.
 *
 * Called by KAN-87 to trigger local notifee notifications.
 */
export function subscribeToSharedTaskNotifications(
  uid: string,
  onNotification: (n: PendingNotification) => void,
): () => void {
  return onSnapshot(
    collection(getFirestore(), 'pendingNotifications', uid, 'items'),
    { includeMetadataChanges: false },
    snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data() as Omit<PendingNotification, 'id'>;
          onNotification({ id: change.doc.id, ...data });
          // Delete after delivery to avoid re-triggering on reconnect.
          deleteDoc(change.doc.ref).catch(() => {});
        }
      });
    },
  );
}
