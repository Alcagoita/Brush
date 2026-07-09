import { getAuth } from '@react-native-firebase/auth/lib/modular';
import { logPoiInferenceMiss } from '../../src/services/firestore';
import { parseMessageToTask } from '../../src/services/functions';
import { inferPoiFromRules } from '../../src/services/poiInference';
import { searchPlaceTypesCached } from '../../src/services/poiTypeCache';

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: jest.fn(),
}));

jest.mock('../../src/services/firestore', () => ({
  logPoiInferenceMiss: jest.fn(),
}));

jest.mock('../../src/services/poiInference', () => ({
  inferPoiFromRules: jest.fn(),
}));

jest.mock('../../src/services/poiTypeCache', () => ({
  searchPlaceTypesCached: jest.fn(),
}));

const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;
const mockLogPoiInferenceMiss = logPoiInferenceMiss as jest.MockedFunction<typeof logPoiInferenceMiss>;
const mockInferPoiFromRules = inferPoiFromRules as jest.MockedFunction<typeof inferPoiFromRules>;
const mockSearchPlaceTypesCached = searchPlaceTypesCached as jest.MockedFunction<typeof searchPlaceTypesCached>;

describe('parseMessageToTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } } as ReturnType<typeof getAuth>);
    mockInferPoiFromRules.mockReturnValue(null);
    mockSearchPlaceTypesCached.mockResolvedValue([]);
    mockLogPoiInferenceMiss.mockResolvedValue(undefined);
  });

  it('logs a low-confidence parse miss when both local passes fail', async () => {
    const result = await parseMessageToTask('Need some unclear place');

    expect(result.confidence).toBe('low');
    expect(mockLogPoiInferenceMiss).toHaveBeenCalledWith('uid-1', 'Need some unclear place');
  });

  it('does not log when no user is signed in', async () => {
    mockGetAuth.mockReturnValue({ currentUser: null } as ReturnType<typeof getAuth>);

    await parseMessageToTask('Need some unclear place');

    expect(mockLogPoiInferenceMiss).not.toHaveBeenCalled();
  });

  it('does not log when a direct local rule already resolves the POI', async () => {
    mockInferPoiFromRules.mockReturnValue('pharmacy');

    const result = await parseMessageToTask('Pick up medicine');

    expect(result.confidence).toBe('high');
    expect(mockLogPoiInferenceMiss).not.toHaveBeenCalled();
  });
});
