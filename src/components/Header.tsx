/**
 * Header — sticky top bar (zIndex 3).
 *
 * Layout: [Avatar] [Greeting · Name [PointsChip?]]  [People] [Bell]
 *
 * The unread dot on the bell is peach (palette.accent).
 * Greeting adapts to the time of day.
 * The points chip (KAN-134) is always shown inline after the name (even at 0),
 * displaying the user's total achievement points to drive engagement.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { BellIcon, FilledStarIcon, UsersIcon } from './AppIcon';
import Avatar from './Avatar';
import { COPY } from '../constants/copy';

interface Props {
  displayName: string;
  /** Firebase Auth photoURL — forwarded to Avatar (dot shown when absent). */
  photoURL?:    string | null;
  hasUnread?: boolean;
  /** Badge count on the people/social icon (KAN-100). */
  socialBadge?: number;
  /** Total achievement points (KAN-134). Always visible, even at 0. */
  points?: number;
  onAvatarPress?: () => void;
  onBellPress?: () => void;
  onPeoplePress?: () => void;
  /** Navigate to Achievements when streak chip is tapped (KAN-134). */
  onAchievementsPress?: () => void;
  /** Context chip (KAN-241) — rendered next to the greeting. Absent by default. */
  contextChip?: React.ReactNode;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return COPY.header.goodMorning;
  if (h >= 12 && h < 17) return COPY.header.goodAfternoon;
  if (h >= 17 && h < 22) return COPY.header.goodEvening;
  return COPY.header.goodNight;
}

export default function Header({
  displayName,
  photoURL,
  hasUnread = false,
  socialBadge = 0,
  points = 0,
  onAvatarPress,
  onBellPress,
  onPeoplePress,
  onAchievementsPress,
  contextChip,
}: Props) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  // Re-evaluate the greeting every 60 s so it updates if the app stays open
  // across a time boundary (e.g. morning → afternoon).
  const [greet, setGreet] = useState(greeting);
  useEffect(() => {
    const id = setInterval(() => setGreet(greeting()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 12,
          backgroundColor: palette.bg,
          borderBottomColor: palette.line,
        },
      ]}>
      {/* Avatar — amber dot default (KAN-78); taps navigate to Profile */}
      <Avatar
        photoURL={photoURL}
        size={36}
        onPress={onAvatarPress}
        accessibilityLabel={COPY.header.openProfileA11y}
      />

      {/* Greeting + name row + optional streak chip */}
      <View style={styles.greetingWrap}>
        <View style={styles.greetingRow}>
          <Text style={[styles.greeting, { color: palette.muted }]} numberOfLines={1}>
            {greet}
          </Text>
          {contextChip}
        </View>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          <TouchableOpacity
              style={[styles.streakChip, { backgroundColor: palette.nearTint }]}
              onPress={onAchievementsPress}
              disabled={!onAchievementsPress}
              accessibilityRole={onAchievementsPress ? 'button' : 'text'}
              accessibilityLabel={COPY.header.pointsA11y(points)}
              accessibilityState={{ disabled: !onAchievementsPress }}
              hitSlop={onAchievementsPress ? 6 : undefined}>
              <FilledStarIcon color={palette.accent} size={12} />
              <Text style={[styles.streakCount, { color: palette.nearText }]}>
                {COPY.header.pointsSuffix(points)}
              </Text>
            </TouchableOpacity>
        </View>
      </View>

      {/* People / Social hub */}
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onPeoplePress}
        accessibilityRole="button"
        accessibilityLabel={socialBadge > 0 ? COPY.header.socialA11y(socialBadge) : COPY.header.socialA11yNoBadge}>
        <UsersIcon color={palette.text} size={20} />
        {socialBadge > 0 && (
          <View style={[styles.dot, { backgroundColor: palette.accent, shadowColor: palette.bg }]} />
        )}
      </TouchableOpacity>

      {/* Bell */}
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onBellPress}
        accessibilityRole="button"
        accessibilityLabel={hasUnread ? COPY.header.notificationsA11yUnread : COPY.header.notificationsA11y}>
        <BellIcon color={palette.text} size={20} />
        {hasUnread && (
          <View style={[styles.dot, { backgroundColor: palette.accent, shadowColor: palette.bg }]} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 8,
    zIndex: 3,
  },
  greetingWrap: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greeting: {
    fontSize: 11,
    fontFamily: 'Geist-Regular',
    letterSpacing: 0.2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    flexShrink: 1,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 19,
    paddingLeft: 6,
    paddingRight: 7,
    borderRadius: 999,
    flexShrink: 0,
  },
  streakCount: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    letterSpacing: -0.12,
    fontVariant: ['tabular-nums'],
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 9999,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 2,
    shadowOpacity: 1,
    elevation: 0,
  },
});
