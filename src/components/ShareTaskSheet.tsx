/**
 * ShareTaskSheet — KAN-86
 *
 * Bottom sheet modal for sending a task to another Brush user.
 * Entry point: "Share task" secondary action in TaskFormScreen (edit mode).
 *
 * Flow:
 *   1. User types a recipient email address
 *   2. "Find user" — exact Firestore lookup
 *   3. Matched user displayed; user taps "Send"
 *   4. Inline confirmation: "Sent to {name}" — no separate screen
 *
 * Guards:
 *   - Cannot send to yourself
 *   - Cannot send while lookup or send is in progress
 */

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { getScreenKeyboardAvoidingBehavior } from '../utils/keyboardAvoiding';
import { findUserByEmail, sendSharedTask, UserSummary } from '../services/sharing';
import { Task } from '../types';
import { COPY } from '../constants/copy';
import { logTap } from '../services/analytics';

export interface ShareTaskSheetProps {
  visible:      boolean;
  onClose:      () => void;
  senderUid:    string;
  senderName:   string;
  task:         Task;
}

type LookupState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'found';    user: UserSummary }
  | { status: 'notFound' }
  | { status: 'error';    message: string };

type SendState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'sent';    recipientName: string }
  | { status: 'error';   message: string };

export default function ShareTaskSheet({
  visible,
  onClose,
  senderUid,
  senderName,
  task,
}: ShareTaskSheetProps) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const [email,       setEmail]       = useState('');
  const [lookupState, setLookupState] = useState<LookupState>({ status: 'idle' });
  const [sendState,   setSendState]   = useState<SendState>({ status: 'idle' });

  const reset = useCallback(() => {
    setEmail('');
    setLookupState({ status: 'idle' });
    setSendState({ status: 'idle' });
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleFindUser = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { return; }

    if (trimmed === senderUid) {
      setLookupState({ status: 'error', message: COPY.shareTaskSheet.cannotSendToSelf });
      return;
    }

    setLookupState({ status: 'searching' });
    try {
      const user = await findUserByEmail(trimmed);
      if (!user) {
        setLookupState({ status: 'notFound' });
        return;
      }
      if (user.uid === senderUid) {
        setLookupState({ status: 'error', message: COPY.shareTaskSheet.cannotSendToSelf });
        return;
      }
      setLookupState({ status: 'found', user });
    } catch {
      setLookupState({ status: 'error', message: COPY.shareTaskSheet.searchError });
    }
  }, [email, senderUid]);

  const handleSend = useCallback(async () => {
    if (lookupState.status !== 'found') { return; }
    const { user } = lookupState;

    setSendState({ status: 'sending' });
    try {
      await sendSharedTask({
        senderUid,
        senderName,
        recipientUid:  user.uid,
        recipientName: user.displayName,
        task,
      });
      logTap('share_task');
      setSendState({ status: 'sent', recipientName: user.displayName });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : COPY.shareTaskSheet.sendFailedDefault;
      setSendState({ status: 'error', message: msg });
    }
  }, [lookupState, senderUid, senderName, task]);

  const isSending = sendState.status === 'sending';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}>
      <Pressable
        style={styles.scrim}
        onPress={handleClose}
        accessibilityLabel={COPY.shareTaskSheet.closeA11y}
      />
      <KeyboardAvoidingView
        behavior={getScreenKeyboardAvoidingBehavior()}
        style={styles.sheetWrapper}>
        <View style={[
          styles.sheet,
          {
            backgroundColor:    palette.surface,
            paddingBottom:      insets.bottom + 24,
            borderTopColor:     palette.line,
          },
        ]}>
          {/* ── Header ── */}
          <View style={[styles.header, { borderBottomColor: palette.line }]}>
            <Text style={[styles.title, { color: palette.text }]}>{COPY.shareTaskSheet.title}</Text>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              accessibilityLabel={COPY.shareTaskSheet.closeButtonA11y}>
              <Text style={[styles.closeBtn, { color: palette.muted }]}>✕</Text>
            </Pressable>
          </View>

          {/* ── Task summary ── */}
          <View style={[styles.taskRow, { borderColor: palette.line, backgroundColor: palette.surface2 }]}>
            <Text style={[styles.taskTitle, { color: palette.text }]} numberOfLines={1}>
              {task.title}
            </Text>
          </View>

          {/* ── Email input ── */}
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.emailInput,
                {
                  color:           palette.text,
                  backgroundColor: palette.bg,
                  borderColor:     palette.line,
                },
              ]}
              placeholder={COPY.shareTaskSheet.emailPlaceholder}
              placeholderTextColor={palette.faint}
              value={email}
              onChangeText={v => {
                setEmail(v);
                setLookupState({ status: 'idle' });
                setSendState({ status: 'idle' });
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="search"
              onSubmitEditing={handleFindUser}
              editable={!isSending}
              accessibilityLabel={COPY.shareTaskSheet.emailA11y}
            />
            <Pressable
              onPress={handleFindUser}
              disabled={!email.trim() || lookupState.status === 'searching' || isSending}
              style={[
                styles.findBtn,
                {
                  backgroundColor: palette.accent,
                  opacity: (!email.trim() || lookupState.status === 'searching' || isSending) ? 0.5 : 1,
                },
              ]}
              accessibilityLabel={COPY.shareTaskSheet.findA11y}>
              {lookupState.status === 'searching'
                ? <ActivityIndicator size="small" color={palette.bg} />
                : <Text style={[styles.findBtnLabel, { color: palette.bg }]}>{COPY.shareTaskSheet.find}</Text>
              }
            </Pressable>
          </View>

          {/* ── Lookup result ── */}
          {lookupState.status === 'found' && (
            <View style={[styles.resultRow, { backgroundColor: palette.surface2, borderColor: palette.line }]}>
              <View style={[styles.avatarDot, { backgroundColor: palette.accent }]}>
                <Text style={[styles.avatarLetter, { color: palette.bg }]}>
                  {lookupState.user.displayName[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <Text style={[styles.recipientName, { color: palette.text }]}>
                {lookupState.user.displayName}
              </Text>
            </View>
          )}

          {lookupState.status === 'notFound' && (
            <Text style={[styles.inlineMsg, { color: palette.muted }]}>
              {COPY.shareTaskSheet.noUserFound}
            </Text>
          )}

          {lookupState.status === 'error' && (
            <Text style={[styles.inlineMsg, { color: '#e05252' }]}>
              {lookupState.message}
            </Text>
          )}

          {/* ── Send result ── */}
          {sendState.status === 'sent' && (
            <Text style={[styles.inlineMsg, { color: palette.accent }]}>
              {COPY.shareTaskSheet.sentTo(sendState.recipientName)}
            </Text>
          )}

          {sendState.status === 'error' && (
            <Text style={[styles.inlineMsg, { color: '#e05252' }]}>
              {sendState.message}
            </Text>
          )}

          {/* ── Send button ── */}
          {lookupState.status === 'found' && sendState.status !== 'sent' && (
            <Pressable
              onPress={handleSend}
              disabled={isSending}
              style={({ pressed }) => [
                styles.sendBtn,
                { backgroundColor: palette.text, opacity: (isSending || pressed) ? 0.7 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={COPY.share.sendButton(lookupState.user.displayName)}>
              {isSending
                ? <ActivityIndicator size="small" color={palette.bg} />
                : <Text style={[styles.sendBtnLabel, { color: palette.bg }]}>{COPY.share.sendButton(lookupState.user.displayName)}</Text>
              }
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrapper: {
    flex:           1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    borderTopWidth:       1,
    paddingTop:           4,
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.page,
    paddingVertical:   16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize:   16,
    fontFamily: 'Geist-SemiBold',
    fontWeight: '600',
  },
  closeBtn: {
    fontSize:   16,
    lineHeight: 20,
  },
  taskRow: {
    marginHorizontal: spacing.page,
    marginTop:        16,
    borderRadius:     radius.card,
    borderWidth:      1,
    paddingHorizontal: 14,
    paddingVertical:   12,
  },
  taskTitle: {
    fontSize:   15,
    fontFamily: 'Geist-Medium',
    fontWeight: '500',
  },
  inputRow: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              10,
    marginHorizontal: spacing.page,
    marginTop:        16,
  },
  emailInput: {
    flex:              1,
    height:            44,
    borderRadius:      radius.ctaBtn,
    borderWidth:       1,
    paddingHorizontal: 14,
    fontSize:          15,
    fontFamily:        'Geist-Regular',
  },
  findBtn: {
    height:            44,
    paddingHorizontal: 18,
    borderRadius:      radius.ctaBtn,
    alignItems:        'center',
    justifyContent:    'center',
    minWidth:          64,
  },
  findBtnLabel: {
    fontSize:   15,
    fontFamily: 'Geist-SemiBold',
    fontWeight: '600',
  },
  resultRow: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              10,
    marginHorizontal: spacing.page,
    marginTop:        12,
    borderRadius:     radius.card,
    borderWidth:      1,
    paddingHorizontal: 14,
    paddingVertical:   12,
  },
  avatarDot: {
    width:          32,
    height:         32,
    borderRadius:   16,
    alignItems:     'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize:   14,
    fontFamily: 'Geist-SemiBold',
    fontWeight: '600',
  },
  recipientName: {
    fontSize:   15,
    fontFamily: 'Geist-Medium',
    fontWeight: '500',
  },
  inlineMsg: {
    marginHorizontal: spacing.page,
    marginTop:        10,
    fontSize:         14,
    fontFamily:       'Geist-Regular',
  },
  sendBtn: {
    marginHorizontal: spacing.page,
    marginTop:        16,
    height:           48,
    borderRadius:     radius.ctaBtn,
    alignItems:       'center',
    justifyContent:   'center',
  },
  sendBtnLabel: {
    fontSize:   16,
    fontFamily: 'Geist-SemiBold',
    fontWeight: '600',
  },
});
