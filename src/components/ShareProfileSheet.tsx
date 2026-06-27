/**
 * ShareProfileSheet — KAN-115
 *
 * Bottom sheet for sharing the user's Brush Away profile link.
 * Opened from the "Share my profile" row on ProfileScreen.
 *
 * Animation:
 *   Scrim:  opacity 0→1, 250ms, ease-out
 *   Sheet:  translateY(screenHeight)→0, 320ms, cubic-bezier(0.32,0.72,0,1)
 *
 * Targets:
 *   Copy link  — copies brushaway.app/u/{username} to clipboard; shows "Copied!" for 2.5s
 *   Message    — opens native OS share sheet
 *   QR code    — placeholder (no-op for v1)
 *   More       — opens native OS share sheet
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { logTap } from '../services/analytics';
import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  GridIcon,
  MessageIcon,
  QrCodeIcon,
  StarIcon,
} from './AppIcon';
import Avatar from './Avatar';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ShareProfileSheetProps {
  visible:        boolean;
  onClose:        () => void;
  onSetUsername?: () => void;
  displayName:    string;
  username?:      string;
  totalPoints:    number;
  photoURL?:      string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShareProfileSheet({
  visible,
  onClose,
  onSetUsername,
  displayName,
  username,
  totalPoints,
  photoURL,
}: ShareProfileSheetProps) {
  const { palette }               = useTheme();
  const insets                    = useSafeAreaInsets();
  const { height: screenHeight }  = useWindowDimensions();

  // Animated values
  const scrimOpacity    = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(screenHeight)).current;

  // Internal modal visibility — delayed hide until out-animation finishes
  const [modalVisible, setModalVisible] = useState(false);

  // Copy state
  const [copied, setCopied]        = useState(false);
  const copyTimeoutRef             = useRef<ReturnType<typeof setTimeout> | null>(null);

  const profileUrl = `https://brushaway.app/u/${username ?? ''}`;

  // ── Open / close animation ──────────────────────────────────────────────────

  useEffect(() => {
    if (visible) {
      setCopied(false);
      setModalVisible(true);
      scrimOpacity.setValue(0);
      sheetTranslateY.setValue(screenHeight);
      Animated.parallel([
        Animated.timing(scrimOpacity, {
          toValue:         1,
          duration:        250,
          easing:          Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue:         0,
          duration:        320,
          easing:          Easing.bezier(0.32, 0.72, 0, 1),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Clear copy timeout on close
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
      setCopied(false);
      Animated.parallel([
        Animated.timing(scrimOpacity, {
          toValue:         0,
          duration:        200,
          easing:          Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue:         screenHeight,
          duration:        200,
          easing:          Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) { setModalVisible(false); }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, screenHeight]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleCopyLink = useCallback(() => {
    logTap('share_profile', { method: 'copy_link' });
    Clipboard.setString(profileUrl);
    setCopied(true);
    if (copyTimeoutRef.current) { clearTimeout(copyTimeoutRef.current); }
    copyTimeoutRef.current = setTimeout(() => { setCopied(false); }, 2500);
  }, [profileUrl]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ url: profileUrl, message: profileUrl });
      logTap('share_profile', { method: 'share_sheet' });
    } catch {
      // User cancelled or share unavailable — silent
    }
  }, [profileUrl]);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!modalVisible) { return null; }

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent>

      {/* ── Scrim ── */}
      <Animated.View
        style={[styles.scrim, { opacity: scrimOpacity }]}
        pointerEvents="box-none">
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
        />
      </Animated.View>

      {/* ── Sheet ── */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor:  palette.bg,
            borderTopColor:   palette.line,
            paddingBottom:    insets.bottom + 8,
            transform:        [{ translateY: sheetTranslateY }],
          },
        ]}>

        {/* Drag handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: palette.surface2 }]} />
        </View>

        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: palette.text }]}>
            Share my profile
          </Text>
          <Pressable
            style={[styles.closeBtn, { backgroundColor: palette.surface2 }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close">
            <CloseIcon color={palette.muted} size={16} />
          </Pressable>
        </View>

        {/* Profile mini-card */}
        <View
          style={[
            styles.miniCard,
            { backgroundColor: palette.surface, marginHorizontal: spacing.page },
          ]}>
          <Avatar
            photoURL={photoURL ?? null}
            displayName={displayName}
            size={46}
            accessibilityLabel="Profile photo"
          />
          <View style={styles.miniCardText}>
            <Text style={[styles.miniCardName, { color: palette.text }]} numberOfLines={1}>
              {displayName || '—'}
            </Text>
            {username ? (
              <Text style={[styles.miniCardUsername, { color: palette.accent }]} numberOfLines={1}>
                @{username}
              </Text>
            ) : null}
          </View>

          {/* Points pill */}
          <View
            style={[
              styles.pointsPill,
              { backgroundColor: palette.nearTint, borderColor: palette.nearBorder },
            ]}>
            <StarIcon color={palette.nearText} size={10} />
            <Text style={[styles.pointsPillText, { color: palette.nearText }]}>
              {`${totalPoints} pts`}
            </Text>
          </View>
        </View>

        {/* Targets grid — or no-username prompt */}
        {!username ? (
          <View style={styles.noUsernameWrap}>
            <Text style={[styles.noUsernameTitle, { color: palette.text }]}>
              Set a username first
            </Text>
            <Text style={[styles.noUsernameBody, { color: palette.muted }]}>
              Your profile link uses your username — add one to share your profile.
            </Text>
            {onSetUsername ? (
              <Pressable
                style={[styles.setUsernameBtn, { backgroundColor: palette.text }]}
                onPress={() => { onClose(); onSetUsername(); }}
                accessibilityRole="button"
                accessibilityLabel="Set username">
                <Text style={[styles.setUsernameBtnLabel, { color: palette.bg }]}>
                  Set username
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.targetsGrid}>

            {/* Copy link */}
            <Pressable
              style={[styles.targetTile, { backgroundColor: palette.surface }]}
              onPress={handleCopyLink}
              accessibilityRole="button"
              accessibilityLabel={copied ? 'Link copied' : 'Copy link'}>
              <View style={[styles.targetIconWell, { backgroundColor: palette.surface2 }]}>
                {copied
                  ? <CheckIcon color={palette.accent} size={22} />
                  : <CopyIcon  color={palette.muted}  size={22} />
                }
              </View>
              <Text style={[styles.targetLabel, { color: copied ? palette.accent : palette.muted }]}>
                {copied ? 'Copied!' : 'Copy link'}
              </Text>
            </Pressable>

            {/* Message */}
            <Pressable
              style={[styles.targetTile, { backgroundColor: palette.surface }]}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Share via message">
              <View style={[styles.targetIconWell, { backgroundColor: palette.surface2 }]}>
                <MessageIcon color={palette.muted} size={22} />
              </View>
              <Text style={[styles.targetLabel, { color: palette.muted }]}>Message</Text>
            </Pressable>

            {/* QR code — v1 placeholder */}
            <Pressable
              style={[styles.targetTile, { backgroundColor: palette.surface }]}
              onPress={() => { /* v1 placeholder — no destination */ }}
              accessibilityRole="button"
              accessibilityLabel="Show QR code (coming soon)">
              <View style={[styles.targetIconWell, { backgroundColor: palette.surface2 }]}>
                <QrCodeIcon color={palette.faint} size={22} />
              </View>
              <Text style={[styles.targetLabel, { color: palette.faint }]}>QR code</Text>
            </Pressable>

            {/* More */}
            <Pressable
              style={[styles.targetTile, { backgroundColor: palette.surface }]}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="More sharing options">
              <View style={[styles.targetIconWell, { backgroundColor: palette.surface2 }]}>
                <GridIcon color={palette.muted} size={22} />
              </View>
              <Text style={[styles.targetLabel, { color: palette.muted }]}>More</Text>
            </Pressable>

          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Scrim ──
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  // ── Sheet ──
  sheet: {
    position:             'absolute',
    bottom:               0,
    left:                 0,
    right:                0,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    borderTopWidth:       StyleSheet.hairlineWidth,
  },

  // ── Drag handle ──
  handleRow: {
    alignItems:    'center',
    paddingTop:    10,
    paddingBottom: 4,
  },
  handle: {
    width:        36,
    height:       4,
    borderRadius: 2,
  },

  // ── Header row ──
  headerRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 18,
    paddingTop:        16,
    paddingBottom:     14,
  },
  headerTitle: {
    flex:       1,
    fontSize:   16,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  closeBtn: {
    width:          32,
    height:         32,
    borderRadius:   16,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // ── Profile mini-card ──
  miniCard: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            12,
    borderRadius:   16,
    padding:        16,
  },
  miniCardText: {
    flex:    1,
    minWidth: 0,
    gap:     2,
  },
  miniCardName: {
    fontSize:   15,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  miniCardUsername: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },

  // ── Points pill ──
  pointsPill: {
    flexDirection:     'row',
    alignItems:        'center',
    flexShrink:        0,
    paddingHorizontal: 9,
    paddingVertical:   5,
    borderRadius:      9999,
    borderWidth:       1,
  },
  pointsPillText: {
    fontSize:    11,
    fontWeight:  '500',
    fontFamily:  'Geist-Medium',
    fontVariant: ['tabular-nums'],
  },

  // ── No-username prompt ──
  noUsernameWrap: {
    alignItems:        'center',
    paddingHorizontal: 28,
    paddingTop:        20,
    paddingBottom:     28,
    gap:               10,
  },
  noUsernameTitle: {
    fontSize:   17,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    textAlign:  'center',
  },
  noUsernameBody: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
    lineHeight: 20,
  },
  setUsernameBtn: {
    marginTop:         8,
    paddingHorizontal: 28,
    paddingVertical:   13,
    borderRadius:      12,
    alignItems:        'center',
  },
  setUsernameBtnLabel: {
    fontSize:   15,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },

  // ── Targets grid ──
  targetsGrid: {
    flexDirection:     'row',
    paddingHorizontal: 18,
    paddingTop:        14,
    paddingBottom:     28,
    gap:               10,
  },
  targetTile: {
    flex:              1,
    alignItems:        'center',
    paddingVertical:   12,
    paddingHorizontal: 8,
    borderRadius:      16,
    gap:               8,
  },
  targetIconWell: {
    width:          42,
    height:         42,
    borderRadius:   21,
    alignItems:     'center',
    justifyContent: 'center',
  },
  targetLabel: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
  },
});
