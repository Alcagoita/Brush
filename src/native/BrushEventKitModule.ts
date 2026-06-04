import { NativeModules, Platform } from 'react-native';

export interface ReminderItem {
  title: string;
  dueDateString?: string;
}

export interface CalendarEventItem {
  title: string;
  startDateString: string;
  isAllDay: boolean;
}

export interface BrushEventKitModuleInterface {
  fetchReminders(): Promise<ReminderItem[]>;
  fetchCalendarEvents(daysAhead: number): Promise<CalendarEventItem[]>;
}

const { BrushEventKitModule } = NativeModules;

if (Platform.OS === 'ios' && !BrushEventKitModule) {
  console.warn(
    '[BrushEventKitModule] Native module not available. ' +
    'Ensure BrushEventKitModule.swift and .m are compiled into the Xcode target.',
  );
}

export default BrushEventKitModule as BrushEventKitModuleInterface | null;
