import { afterEach, describe, expect, test, vi } from 'vitest';

const setupStore = async () => {
  vi.resetModules();
  const wrappedFetch = vi.fn().mockResolvedValue({
    _id: 'guest-1',
    name: '',
    roles: ['guest'],
  });
  const userStore = {
    profile: null,
    clearProfile: vi.fn(),
    getProfile: vi.fn(),
  };
  vi.stubGlobal(
    'defineStore',
    (_id: string, factory: () => unknown) => factory,
  );
  vi.stubGlobal('ref', <T>(value: T) => ({ value }));
  vi.stubGlobal('useRuntimeConfig', () => ({
    public: {
      API_URL: 'http://api.test',
      cookie: { ate: 900, rte: 2_592_000 },
      siteUrl: 'http://localhost:3000',
    },
  }));
  vi.stubGlobal('useRequestEvent', () => undefined);
  vi.stubGlobal('useUserStore', () => userStore);
  vi.stubGlobal('useWrappedFetch', () => wrappedFetch);
  const authModule = await import('../../stores/auth');
  return {
    store: authModule.useAuthStore() as ReturnType<
      typeof authModule.useAuthStore
    >,
    wrappedFetch,
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('auth store', () => {
  test('uses one guest request for concurrent bootstrap calls', async () => {
    const { store, wrappedFetch } = await setupStore();

    await Promise.all([
      store.ensureGuestProfile(),
      store.ensureGuestProfile(),
      store.ensureGuestProfile(),
    ]);

    expect(wrappedFetch).toHaveBeenCalledOnce();
    expect(wrappedFetch).toHaveBeenCalledWith('/auth/guest', {
      method: 'POST',
      skipGuestBootstrap: true,
    });
  });
});
