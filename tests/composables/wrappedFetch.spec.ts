import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authStore: {
    accessToken: 'access-token' as string | null,
    refreshToken: 'refresh-token' as string | null,
    guestId: 'guest-id' as string | null,
    refreshSession: vi.fn(),
    clearTokens: vi.fn(),
  },
}));

vi.mock('~/stores/auth', () => ({
  useAuthStore: () => mocks.authStore,
}));

const setupWrappedFetch = async () => {
  vi.resetModules();
  const addNotification = vi.fn();
  const fetchMock = vi.fn();
  vi.stubGlobal('useNotificationStore', () => ({ addNotification }));
  vi.stubGlobal('useRuntimeConfig', () => ({
    public: { API_URL: 'http://api.test', debug: false },
  }));
  vi.stubGlobal('$fetch', fetchMock);
  vi.stubGlobal('sleep', vi.fn());
  const { useWrappedFetch } = await import('../../composables/wrappedFetch');
  return { wrappedFetch: useWrappedFetch(), fetchMock, addNotification };
};

beforeEach(() => {
  mocks.authStore.accessToken = 'access-token';
  mocks.authStore.refreshToken = 'refresh-token';
  mocks.authStore.guestId = 'guest-id';
  mocks.authStore.refreshSession.mockReset();
  mocks.authStore.clearTokens.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useWrappedFetch', () => {
  test('adds credentials and default timeout to API request', async () => {
    const { wrappedFetch, fetchMock } = await setupWrappedFetch();
    fetchMock.mockResolvedValue({ ok: true });

    await expect(wrappedFetch('/room')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/room', {
      timeout: 12_000,
      headers: {
        Authorization: 'Bearer access-token',
        'X-GUEST-ID': 'guest-id',
      },
    });
  });

  test('refreshes access token once and retries original request after 401', async () => {
    const { wrappedFetch, fetchMock } = await setupWrappedFetch();
    const unauthorized = { response: { status: 401 } };
    fetchMock
      .mockRejectedValueOnce(unauthorized)
      .mockResolvedValueOnce({ ok: true });
    mocks.authStore.refreshSession.mockResolvedValue({
      access_token: 'renewed-token',
    });

    await expect(wrappedFetch('/room/1')).resolves.toEqual({ ok: true });
    expect(mocks.authStore.refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://api.test/room/1', {
      timeout: 12_000,
      headers: {
        Authorization: 'Bearer renewed-token',
        'X-GUEST-ID': 'guest-id',
      },
    });
  });

  test('does not refresh an explicitly excluded 401 request', async () => {
    const { wrappedFetch, fetchMock } = await setupWrappedFetch();
    const unauthorized = { response: { status: 401 } };
    fetchMock.mockRejectedValue(unauthorized);

    await expect(
      wrappedFetch('/user/password', { skipAuthRefresh: true }),
    ).rejects.toBe(unauthorized);
    expect(mocks.authStore.refreshSession).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('clears tokens when refresh fails', async () => {
    const { wrappedFetch, fetchMock } = await setupWrappedFetch();
    const unauthorized = { response: { status: 401 } };
    fetchMock.mockRejectedValue(unauthorized);
    mocks.authStore.refreshSession.mockRejectedValue(new Error('expired'));

    await expect(wrappedFetch('/room/1')).rejects.toBe(unauthorized);
    expect(mocks.authStore.clearTokens).toHaveBeenCalledTimes(1);
  });
});
