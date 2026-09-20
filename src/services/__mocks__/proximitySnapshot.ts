/**
 * Manual Jest mock for proximitySnapshot.ts (KAN-285).
 *
 * proximity.ts fire-and-forgets into this module, which pulls in
 * expo-sqlite (ESM, breaks Jest's transform). Every test file that
 * transitively imports proximity.ts but isn't testing the snapshot cache
 * itself should `jest.mock('.../services/proximitySnapshot')` with no
 * factory — Jest picks up this file automatically — instead of redefining
 * the same stub inline.
 */

export const saveProximitySnapshot = jest.fn();
export const loadProximitySnapshot = jest.fn().mockReturnValue(null);
export const __resetProximitySnapshotDbForTests = jest.fn();
