/**
 * Header — sticky top bar (zIndex 3).
 *
 * Layout: [Avatar] [Greeting · Name]  [Bell 🔔]
 *
 * The unread dot on the bell is peach (palette.accent).
 * Greeting adapts to the time of day.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { spacing } from '../theme/tokens';
import { BellIcon } from './AppIcon';

interface Props {
  displayName: string;
  hasUnread?: boolean;
  onAvatarPress?: () => void;
  onBellPress?: () => void;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 22) return 'Good evening';
  return 'Good night';
}

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export default function Header({ displayName, hasUnread = false, onAvatarPress, onBellPress }: Props) {
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
      {/* Avatar — taps navigate to Profile */}
      <TouchableOpacity
        style={[styles.avatar, { backgroundColor: palette.surface2 }]}
        onPress={onAvatarPress}
        accessibilityRole="button"
        accessibilityLabel="Open profile">
        <Text style={[styles.avatarText, { color: palette.text }]}>
          {initials(displayName)}
        </Text>
      </TouchableOpacity>

      {/* Greeting */}
      <View style={styles.greetingWrap}>
        <Text style={[styles.greeting, { color: palette.muted }]} numberOfLines={1}>
          {greet}
        </Text>
        <Text style={[styles.name, { color: palette.text }]} numberOfLines={1}>
          {displayName}
        </Text>
      </View>

      {/* Bell */}
      <TouchableOpacity
        style={styles.bell}
        onPress={onBellPress}
        accessibilityRole="button"
        accessibilityLabel={hasUnread ? 'Notifications, unread' : 'Notifications'}>
        <BellIcon color={palette.text} size={20} />
        {hasUnread && (
          <View style={[styles.dot, { backgroundColor: palette.accent }]} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    paddingBottom: 14,
    zIndex: 3,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
  greetingWrap: {
    flex: 1,
    marginLeft: 12,
  },
  greeting: {
    fontSize: 11,
    fontFamily: 'Geist-Regular',
    letterSpacing: 0.2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
  bell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 9999,
  },
});
