import analytics from '@react-native-firebase/analytics';

export type AnalyticsEvent =
  | 'task_complete'
  | 'task_create'
  | 'task_edit'
  | 'task_delete'
  | 'poi_chip_tap'
  | 'nearby_open_maps'
  | 'nearby_refresh'
  | 'login'
  | 'logout'
  | 'share_task'
  | 'share_profile'
  | 'calendar_import'
  | 'challenge_create'
  | 'achievement_unlocked'
  | 'settings_theme_toggle';

type EventParams = Record<string, string | number | boolean>;

export function logTap(event: AnalyticsEvent, params?: EventParams): void {
  analytics().logEvent(event, params).catch(() => {});
}
