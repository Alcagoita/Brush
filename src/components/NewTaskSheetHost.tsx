/**
 * NewTaskSheetHost — render boundary for the New Task sheet.
 *
 * Subscribes to `useNewTaskSheetStore` so that opening/closing the sheet
 * re-renders ONLY this host (and the sheet), never the parent TodayScreen.
 * TodayScreen renders this once with stable props and is never re-rendered by
 * a sheet toggle — the close-freeze was the whole screen re-committing on a
 * visibility flip that changed nothing on screen.
 */

import React from 'react';
import NewTaskSheet from './NewTaskSheet';
import { useNewTaskSheetStore } from '../store/newTaskSheetStore';
import type { Category } from '../types';

interface Props {
  uid: string;
  customCategories: Category[];
  /** Fired after a task is created so the Today list can refresh. */
  onTaskAdded: () => void;
}

export default function NewTaskSheetHost({ uid, customCategories, onTaskAdded }: Props) {
  const visible = useNewTaskSheetStore(s => s.visible);
  const close   = useNewTaskSheetStore(s => s.close);

  return (
    <NewTaskSheet
      visible={visible}
      uid={uid}
      onClose={close}
      onTaskAdded={onTaskAdded}
      customCategories={customCategories}
    />
  );
}
