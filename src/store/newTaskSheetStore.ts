import { create } from 'zustand';

/**
 * newTaskSheetStore — visibility state for the New Task bottom sheet.
 *
 * Deliberately NOT screen state. Opening/closing the sheet must never
 * re-render TodayScreen (ring, header, FlatList, all derived values). Only a
 * thin host that subscribes here re-renders on toggle. Callers that just need
 * to open/close (FAB, empty-state CTA) use `useNewTaskSheetStore.getState()`
 * so they never subscribe and never re-render.
 */
interface NewTaskSheetStore {
  visible: boolean;
  open:    () => void;
  close:   () => void;
}

export const useNewTaskSheetStore = create<NewTaskSheetStore>((set) => ({
  visible: false,
  open:  () => set({ visible: true }),
  close: () => set({ visible: false }),
}));
