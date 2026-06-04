import { NativeModules, Platform } from 'react-native';

export interface WearSyncModuleInterface {
  syncTasks(tasksJson: string): void;
}

const { WearSyncModule } = NativeModules;

if (Platform.OS === 'android' && !WearSyncModule) {
  console.warn(
    '[WearSyncModule] Native module not available. ' +
    'Ensure WearSyncModule.kt is registered in MainApplication.',
  );
}

export default WearSyncModule as WearSyncModuleInterface | null;
