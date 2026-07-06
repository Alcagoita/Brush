import { create } from 'zustand';
import type { Task, Category, User, UserPreferences, Trip, MallSnapshot } from '../types';

export interface BootData {
  ownerUid:          string;
  tasks:             Task[];
  customCategories:  Category[];
  totalPoints:       number;
  inboxCount:        number;
  socialUnreadCount: number;
  userPrefs:         Partial<UserPreferences>;
  poiPrefsMap:       Record<string, number>;
  userData:          User | null;
  /** Downloaded trip areas (KAN-234) — Calendar/Places I Know read from here instead of re-fetching. */
  trips:             Trip[];
  /** Current mall snapshot (KAN-237), if the user has one learned — fed into proximity.ts's cache-first check. */
  mallSnapshot:      MallSnapshot | null;
}

interface AppStore {
  bootData: BootData | null;
  setBootData:   (data: BootData) => void;
  clearBootData: () => void;
  /** Update the task list inside boot data (e.g. after a toggle). */
  setTasks:      (tasks: Task[]) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  bootData: null,

  setBootData: (data) => set({ bootData: data }),

  clearBootData: () => set({ bootData: null }),

  setTasks: (tasks) =>
    set((state) =>
      state.bootData ? { bootData: { ...state.bootData, tasks } } : state,
    ),
}));
