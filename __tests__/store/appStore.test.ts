import { useAppStore } from '../../src/store/appStore';
import type { BootData } from '../../src/store/appStore';

const makeBootData = (overrides?: Partial<BootData>): BootData => ({
  ownerUid:         'uid-test',
  tasks:            [],
  customCategories: [],
  totalPoints:      0,
  inboxCount:       0,
  userPrefs:        {},
  poiPrefsMap:      {},
  userData:         null,
  trips:            [],
  mallSnapshot:     null,
  ...overrides,
});

beforeEach(() => {
  // Reset store to initial state before each test.
  useAppStore.setState({ bootData: null });
});

describe('appStore', () => {
  describe('setBootData', () => {
    it('stores boot data', () => {
      const data = makeBootData({ totalPoints: 42, inboxCount: 3 });
      useAppStore.getState().setBootData(data);

      expect(useAppStore.getState().bootData).toEqual(data);
    });

    it('overwrites previously stored boot data', () => {
      useAppStore.getState().setBootData(makeBootData({ totalPoints: 1 }));
      useAppStore.getState().setBootData(makeBootData({ totalPoints: 99 }));

      expect(useAppStore.getState().bootData?.totalPoints).toBe(99);
    });
  });

  describe('clearBootData', () => {
    it('nulls out boot data', () => {
      useAppStore.getState().setBootData(makeBootData());
      useAppStore.getState().clearBootData();

      expect(useAppStore.getState().bootData).toBeNull();
    });

    it('is a no-op when already null', () => {
      expect(() => useAppStore.getState().clearBootData()).not.toThrow();
      expect(useAppStore.getState().bootData).toBeNull();
    });
  });

  describe('setTasks', () => {
    it('updates the task list inside boot data', () => {
      const original = makeBootData({ tasks: [] });
      useAppStore.getState().setBootData(original);

      const newTasks = [{ id: 't1', title: 'Buy milk' }] as any;
      useAppStore.getState().setTasks(newTasks);

      expect(useAppStore.getState().bootData?.tasks).toEqual(newTasks);
    });

    it('preserves other boot data fields when updating tasks', () => {
      useAppStore.getState().setBootData(makeBootData({ totalPoints: 10, inboxCount: 5 }));
      useAppStore.getState().setTasks([]);

      const boot = useAppStore.getState().bootData!;
      expect(boot.totalPoints).toBe(10);
      expect(boot.inboxCount).toBe(5);
    });

    it('is a no-op when boot data is null', () => {
      expect(() => useAppStore.getState().setTasks([])).not.toThrow();
      expect(useAppStore.getState().bootData).toBeNull();
    });
  });
});
