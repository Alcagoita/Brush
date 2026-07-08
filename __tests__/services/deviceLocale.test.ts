describe('deviceLocale', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  function loadWithReactNativeMock(mock: {
    Platform: { OS: 'ios' | 'android' };
    NativeModules: Record<string, unknown>;
  }) {
    jest.doMock('react-native', () => mock);
    let loaded!: typeof import('../../src/services/deviceLocale');
    jest.isolateModules(() => {
      loaded = require('../../src/services/deviceLocale');
    });
    return loaded;
  }

  it('reads iOS AppleLocale when present', () => {
    const mod = loadWithReactNativeMock({
      Platform: { OS: 'ios' },
      NativeModules: { SettingsManager: { settings: { AppleLocale: 'pt_PT' } } },
    });

    expect(mod.rawDeviceLocale()).toBe('pt_PT');
    expect(mod.detectDeviceLanguage()).toBe('pt-PT');
  });

  it('falls back to iOS AppleLanguages[0]', () => {
    const mod = loadWithReactNativeMock({
      Platform: { OS: 'ios' },
      NativeModules: { SettingsManager: { settings: { AppleLanguages: ['en_US'] } } },
    });

    expect(mod.rawDeviceLocale()).toBe('en_US');
    expect(mod.detectDeviceLanguage()).toBe('en');
  });

  it('reads Android localeIdentifier', () => {
    const mod = loadWithReactNativeMock({
      Platform: { OS: 'android' },
      NativeModules: { I18nManager: { localeIdentifier: 'pt-BR' } },
    });

    expect(mod.rawDeviceLocale()).toBe('pt-BR');
    expect(mod.detectDeviceLanguage()).toBe('pt-PT');
  });

  it('falls back to english for missing native shapes', () => {
    const mod = loadWithReactNativeMock({
      Platform: { OS: 'android' },
      NativeModules: {},
    });

    expect(mod.rawDeviceLocale()).toBe('');
    expect(mod.detectDeviceLanguage()).toBe('en');
  });

  it('falls back to english when native access throws', () => {
    const mod = loadWithReactNativeMock({
      Platform: { OS: 'ios' },
      NativeModules: {
        get SettingsManager() {
          throw new Error('boom');
        },
      },
    });

    expect(mod.rawDeviceLocale()).toBe('');
    expect(mod.detectDeviceLanguage()).toBe('en');
  });

  it('maps bare pt locales to pt-PT', () => {
    const mod = loadWithReactNativeMock({
      Platform: { OS: 'android' },
      NativeModules: { I18nManager: { localeIdentifier: 'pt' } },
    });

    expect(mod.detectDeviceLanguage()).toBe('pt-PT');
  });
});
