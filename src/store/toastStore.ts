/**
 * toastStore — KAN-149
 *
 * Global toast state. A single <Toast /> is mounted once at the App root
 * (sibling to <NetworkBanner />) so the confirmation message survives the
 * New Task sheet closing or the More Details screen navigating back —
 * both of which unmount immediately after a successful add.
 *
 * Usage:
 *   import { useToastStore } from '../store/toastStore';
 *   useToastStore.getState().showToast("Got it — I'll keep an eye out.");
 */

import { create } from 'zustand';

interface ToastState {
  message: string | null;
  showToast: (message: string) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  showToast: (message) => set({ message }),
  hideToast: () => set({ message: null }),
}));
