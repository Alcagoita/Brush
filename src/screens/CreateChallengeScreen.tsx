/**
 * CreateChallengeScreen — KAN-102
 *
 * Multi-step challenge creation flow:
 *   Step 1 — Pick challenge type (goal / time)
 *   Step 2 — Set parameters (goal count chips OR deadline picker)
 *   Step 3 — Friend picker (following list, multi-select)
 *   Step 4 — Optional message (max 100 chars) + Send
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import { useTheme } from '../theme';
import { spacing, radius as radii } from '../theme/tokens';
import { ChevronLeftIcon, TrophyIcon } from '../components/AppIcon';
import Avatar from '../components/Avatar';
import { subscribeToFollowing, getUser } from '../services/firestore';
import { createChallenge } from '../services/challenges';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { FollowEntry } from '../types';
import { logTap } from '../services/analytics';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateChallenge'>;

const GOAL_PRESETS = [5, 10, 15, 20];

type Step = 'type' | 'params' | 'friends' | 'message';

export default function CreateChallengeScreen() {
  const { palette } = useTheme();
  const navigation  = useNavigation<Nav>();
  const insets      = useSafeAreaInsets();

  const currentAuth = getAuth().currentUser;
  const uid         = currentAuth?.uid ?? '';
  const displayName = currentAuth?.displayName ?? '';

  // ── Creator info ──────────────────────────────────────────────────────────
  const [creatorUsername, setCreatorUsername] = useState('');
  useEffect(() => {
    if (!uid) { return; }
    getUser(uid).then(u => setCreatorUsername(u?.username ?? ''));
  }, [uid]);

  // ── Multi-step state ──────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('type');

  // Step 1: type
  const [challengeType, setChallengeType] = useState<'goal' | 'time' | null>(null);

  // Step 2: params
  const [goalCount,    setGoalCount]    = useState<number>(10);
  const [customGoal,   setCustomGoal]   = useState('');
  const [deadline,     setDeadline]     = useState<Date>(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d;
  });
  const [showPicker,   setShowPicker]   = useState(false);

  // Step 3: friends
  const [following,    setFollowing]    = useState<FollowEntry[]>([]);
  const [query,        setQuery]        = useState('');
  const [selected,     setSelected]     = useState<Set<string>>(new Set());

  // Step 4: message + send
  const [message,      setMessage]      = useState('');
  const [sending,      setSending]      = useState(false);
  const [error,        setError]        = useState('');
  const [sent,         setSent]         = useState(false);

  useEffect(() => {
    if (!uid) { return; }
    return subscribeToFollowing(uid, setFollowing);
  }, [uid]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) { return following; }
    return following.filter(f =>
      f.displayName.toLowerCase().includes(q) ||
      (f.username ?? '').toLowerCase().includes(q),
    );
  }, [following, query]);

  const selectedFriends = following.filter(f => selected.has(f.uid));
  const isGroup         = selectedFriends.length > 1;

  // ── Navigation ────────────────────────────────────────────────────────────
  const STEPS: Step[] = ['type', 'params', 'friends', 'message'];
  const stepIndex = STEPS.indexOf(step);

  const goNext = () => {
    if (step === 'type'    && challengeType) { setStep('params');  return; }
    if (step === 'params')                   { setStep('friends'); return; }
    if (step === 'friends' && selected.size > 0) { setStep('message'); return; }
  };

  const goBack = () => {
    if (stepIndex <= 0) { navigation.goBack(); return; }
    setStep(STEPS[stepIndex - 1]);
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!challengeType || selectedFriends.length === 0) { return; }
    setSending(true);
    setError('');
    try {
      const effectiveGoal = challengeType === 'goal'
        ? (customGoal ? parseInt(customGoal, 10) : goalCount)
        : undefined;

      await createChallenge({
        creatorUid:      uid,
        creatorUsername,
        creatorName:     displayName,
        type:            challengeType,
        goalCount:       effectiveGoal,
        deadline:        challengeType === 'time' ? deadline : undefined,
        participants:    selectedFriends,
        message:         message.trim() || undefined,
      });
      logTap('challenge_create', { type: challengeType });
      setSent(true);
    } catch (e) {
      setError('Failed to send challenge. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const stepTitle = {
    type:    'New challenge',
    params:  challengeType === 'goal' ? 'Set goal' : 'Set deadline',
    friends: 'Choose opponents',
    message: 'Add a message',
  }[step];

  const canContinue = (
    (step === 'type'    && challengeType !== null) ||
    (step === 'params'  && (challengeType === 'goal'
      ? (customGoal ? parseInt(customGoal, 10) > 0 : goalCount > 0)
      : deadline > new Date())) ||
    (step === 'friends' && selected.size > 0)
  );

  if (sent) {
    return (
      <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }]}>
        <View style={styles.center}>
          <TrophyIcon color={palette.accent} size={48} />
          <Text style={[styles.sentTitle, { color: palette.text }]}>Challenge sent!</Text>
          <Text style={[styles.sentSub, { color: palette.muted }]}>
            Your {isGroup ? 'group' : ''} challenge is on its way.
          </Text>
          <Pressable
            style={[styles.doneBtn, { backgroundColor: palette.text }]}
            onPress={() => navigation.goBack()}>
            <Text style={[styles.doneBtnLabel, { color: palette.bg }]}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: palette.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ paddingTop: insets.top }}>

        {/* Top bar */}
        <View style={[styles.topBar, { borderBottomColor: palette.line }]}>
          <Pressable style={styles.navBtn} onPress={goBack} accessibilityRole="button" accessibilityLabel="Back">
            <ChevronLeftIcon color={palette.text} size={22} />
          </Pressable>
          <Text style={[styles.title, { color: palette.text }]}>{stepTitle}</Text>
          <View style={styles.navBtn} />
        </View>

        {/* Step dots */}
        <View style={styles.stepDots}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[
                styles.dot,
                { backgroundColor: i <= stepIndex ? palette.accent : palette.line },
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled">

        {/* ── Step 1: Type ── */}
        {step === 'type' && (
          <View style={styles.typeCards}>
            {(['goal', 'time'] as const).map(t => {
              const isSelected = challengeType === t;
              return (
                <Pressable
                  key={t}
                  style={[
                    styles.typeCard,
                    { backgroundColor: isSelected ? palette.text : palette.surface2,
                      borderColor: isSelected ? palette.text : palette.line },
                  ]}
                  onPress={() => setChallengeType(t)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={t === 'goal' ? 'Goal-based challenge' : 'Time-based challenge'}>
                  <TrophyIcon color={isSelected ? palette.bg : palette.muted} size={24} />
                  <Text style={[styles.typeTitle, { color: isSelected ? palette.bg : palette.text }]}>
                    {t === 'goal' ? 'First to X tasks' : 'Most tasks by deadline'}
                  </Text>
                  <Text style={[styles.typeSub, { color: isSelected ? palette.bg + 'cc' : palette.muted }]}>
                    {t === 'goal'
                      ? 'Race to complete a set number of tasks'
                      : 'Whoever completes the most tasks wins'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ── Step 2: Params ── */}
        {step === 'params' && challengeType === 'goal' && (
          <View style={styles.paramSection}>
            <Text style={[styles.paramLabel, { color: palette.muted }]}>
              First to complete how many tasks?
            </Text>
            <View style={styles.chips}>
              {GOAL_PRESETS.map(n => (
                <Pressable
                  key={n}
                  style={[
                    styles.chip,
                    { backgroundColor: goalCount === n && !customGoal ? palette.text : palette.surface2,
                      borderColor: goalCount === n && !customGoal ? palette.text : palette.line },
                  ]}
                  onPress={() => { setGoalCount(n); setCustomGoal(''); }}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} tasks`}>
                  <Text style={[styles.chipLabel, {
                    color: goalCount === n && !customGoal ? palette.bg : palette.text,
                  }]}>{n}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.customInput, { color: palette.text, borderColor: customGoal ? palette.accent : palette.line, backgroundColor: palette.surface2 }]}
              placeholder="Custom number…"
              placeholderTextColor={palette.faint}
              keyboardType="number-pad"
              value={customGoal}
              onChangeText={v => { setCustomGoal(v.replace(/[^0-9]/g, '')); }}
              maxLength={4}
              accessibilityLabel="Custom task count"
            />
          </View>
        )}

        {step === 'params' && challengeType === 'time' && (
          <View style={styles.paramSection}>
            <Text style={[styles.paramLabel, { color: palette.muted }]}>
              Challenge ends at:
            </Text>
            <Pressable
              style={[styles.deadlineDisplay, { backgroundColor: palette.surface2, borderColor: palette.line }]}
              onPress={() => setShowPicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Select deadline">
              <Text style={[styles.deadlineText, { color: palette.text }]}>
                {deadline.toLocaleDateString()} · {deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Pressable>
            {(showPicker || Platform.OS === 'ios') && (
              <DateTimePicker
                value={deadline}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                onChange={(_, d) => { setShowPicker(false); if (d) { setDeadline(d); } }}
              />
            )}
          </View>
        )}

        {/* ── Step 3: Friends ── */}
        {step === 'friends' && (
          <View style={styles.friendsSection}>
            <Text style={[styles.paramLabel, { color: palette.muted }]}>
              {isGroup ? `Group challenge (${selected.size} selected)` : 'Select opponents'}
            </Text>
            <View style={[styles.searchRow, { backgroundColor: palette.surface2, borderColor: palette.line }]}>
              <TextInput
                style={[styles.searchInput, { color: palette.text }]}
                placeholder="Search friends…"
                placeholderTextColor={palette.faint}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Search friends"
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={f => f.uid}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const isChecked = selected.has(item.uid);
                return (
                  <Pressable
                    style={[styles.friendRow, { borderBottomColor: palette.line }]}
                    onPress={() => setSelected(prev => {
                      const next = new Set(prev);
                      next.has(item.uid) ? next.delete(item.uid) : next.add(item.uid);
                      return next;
                    })}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isChecked }}
                    accessibilityLabel={item.displayName}>
                    <Avatar photoURL={null} size={36} accessibilityLabel={item.displayName} />
                    <View style={styles.friendText}>
                      <Text style={[styles.friendName, { color: palette.text }]}>{item.displayName}</Text>
                      {item.username ? (
                        <Text style={[styles.friendHandle, { color: palette.muted }]}>@{item.username}</Text>
                      ) : null}
                    </View>
                    <View style={[styles.checkbox,
                      { borderColor: isChecked ? palette.text : palette.line },
                      isChecked && { backgroundColor: palette.text }]}>
                      {isChecked && <Text style={[styles.checkmark, { color: palette.bg }]}>✓</Text>}
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: palette.muted }]}>
                  {following.length === 0 ? "You're not following anyone yet." : `No friends match "${query}".`}
                </Text>
              }
            />
          </View>
        )}

        {/* ── Step 4: Message + Send ── */}
        {step === 'message' && (
          <View style={styles.messageSection}>
            <Text style={[styles.paramLabel, { color: palette.muted }]}>
              Add a message (optional)
            </Text>
            <TextInput
              style={[styles.messageInput, { color: palette.text, borderColor: palette.line, backgroundColor: palette.surface2 }]}
              placeholder="Let's see what you've got! 💪"
              placeholderTextColor={palette.faint}
              value={message}
              onChangeText={v => setMessage(v.slice(0, 100))}
              multiline
              maxLength={100}
              accessibilityLabel="Challenge message"
            />
            <Text style={[styles.charCount, { color: palette.faint }]}>
              {message.length}/100
            </Text>

            {/* Summary */}
            <View style={[styles.summary, { backgroundColor: palette.surface2, borderColor: palette.line }]}>
              <Text style={[styles.summaryLabel, { color: palette.muted }]}>Challenge summary</Text>
              <Text style={[styles.summaryLine, { color: palette.text }]}>
                Type: {challengeType === 'goal'
                  ? `First to ${customGoal || goalCount} tasks`
                  : `Most tasks by ${deadline.toLocaleDateString()}`}
              </Text>
              <Text style={[styles.summaryLine, { color: palette.text }]}>
                Opponents: {selectedFriends.map(f => f.username ? `@${f.username}` : f.displayName).join(', ')}
              </Text>
            </View>

            {error ? (
              <Text style={[styles.errorText, { color: palette.danger }]}>{error}</Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Footer CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: palette.line, backgroundColor: palette.bg }]}>
        <Pressable
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: (step === 'message' ? true : canContinue) ? palette.text : palette.surface2 },
            pressed && { opacity: 0.8 },
          ]}
          onPress={step === 'message' ? handleSend : goNext}
          disabled={step === 'message' ? sending : !canContinue}
          accessibilityRole="button"
          accessibilityLabel={step === 'message' ? 'Send challenge' : 'Continue'}>
          {sending
            ? <ActivityIndicator color={palette.bg} />
            : <Text style={[styles.ctaLabel, {
                color: (step === 'message' ? true : canContinue) ? palette.bg : palette.faint,
              }]}>
                {step === 'message' ? 'Send challenge' : 'Continue'}
              </Text>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.page, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title:  { fontSize: 17, fontWeight: '600', fontFamily: 'Geist-SemiBold' },

  stepDots: {
    flexDirection: 'row', gap: 6, paddingHorizontal: spacing.page,
    paddingVertical: 12, justifyContent: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },

  content: { paddingHorizontal: spacing.page, paddingTop: 16, gap: 16 },

  // Type cards
  typeCards: { gap: 12 },
  typeCard: {
    borderRadius: radii.card, borderWidth: 1,
    padding: 20, gap: 8,
  },
  typeTitle: { fontSize: 16, fontWeight: '600', fontFamily: 'Geist-SemiBold' },
  typeSub:   { fontSize: 13, fontFamily: 'Geist-Regular', lineHeight: 18 },

  // Params
  paramSection: { gap: 16 },
  paramLabel: { fontSize: 13, fontFamily: 'Geist-Medium', fontWeight: '500' },
  chips: { flexDirection: 'row', gap: 10 },
  chip: {
    flex: 1, height: 48, borderRadius: radii.ctaBtn, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  chipLabel: { fontSize: 18, fontWeight: '600', fontFamily: 'Geist-SemiBold', fontVariant: ['tabular-nums'] },
  customInput: {
    height: 48, borderRadius: radii.ctaBtn, borderWidth: 1,
    paddingHorizontal: 16, fontSize: 16, fontFamily: 'Geist-Regular',
  },
  deadlineDisplay: {
    height: 48, borderRadius: radii.ctaBtn, borderWidth: 1,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  deadlineText: { fontSize: 15, fontFamily: 'Geist-Regular' },

  // Friends
  friendsSection: { gap: 12 },
  searchRow: {
    borderRadius: radii.ctaBtn, borderWidth: 1,
    paddingHorizontal: 14, height: 40, justifyContent: 'center',
  },
  searchInput: { fontSize: 14, fontFamily: 'Geist-Regular', height: '100%' },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  friendText: { flex: 1 },
  friendName:   { fontSize: 14, fontFamily: 'Geist-Medium', fontWeight: '500' },
  friendHandle: { fontSize: 12, fontFamily: 'Geist-Regular' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { fontSize: 13, lineHeight: 16 },
  emptyText: { fontSize: 14, fontFamily: 'Geist-Regular', textAlign: 'center', paddingVertical: 24 },

  // Message
  messageSection: { gap: 12 },
  messageInput: {
    borderWidth: 1, borderRadius: radii.card,
    padding: 12, minHeight: 80, textAlignVertical: 'top',
    fontSize: 14, fontFamily: 'Geist-Regular',
  },
  charCount: { fontSize: 11, fontFamily: 'Geist-Regular', textAlign: 'right' },
  summary: {
    borderRadius: radii.card, borderWidth: 1,
    padding: 14, gap: 6,
  },
  summaryLabel: { fontSize: 11, fontFamily: 'Geist-Medium', fontWeight: '500', letterSpacing: 0.5 },
  summaryLine:  { fontSize: 14, fontFamily: 'Geist-Regular' },
  errorText:    { fontSize: 13, fontFamily: 'Geist-Regular' },

  // Sent screen
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: spacing.page },
  sentTitle: { fontSize: 22, fontWeight: '600', fontFamily: 'Geist-SemiBold' },
  sentSub:   { fontSize: 14, fontFamily: 'Geist-Regular', textAlign: 'center' },
  doneBtn:   { marginTop: 8, height: 48, paddingHorizontal: 40, borderRadius: radii.ctaBtn, alignItems: 'center', justifyContent: 'center' },
  doneBtnLabel: { fontSize: 15, fontWeight: '600', fontFamily: 'Geist-SemiBold' },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.page, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cta: {
    height: 52, borderRadius: radii.ctaBtn,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaLabel: { fontSize: 16, fontWeight: '600', fontFamily: 'Geist-SemiBold' },
});
