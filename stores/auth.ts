import type { Nullable } from '~/types';
import { parseCookies, setCookie, deleteCookie, type H3Event } from 'h3';
import { EAuthProvider } from '~/types';
import { multiNavigate } from '~/utils/helpers';

export interface IAuthResponse {
  access_token?: Nullable<string>;
  refresh_token?: Nullable<string>;
  guest_id?: Nullable<string>;
}

export interface IGuestResponse {
  _id: string;
  name: string;
  roles: string[];
}

export interface IAuthByLogin {
  login: string;
  password: string;
}

const REFRESH_LOCK_NAME = 'film-together-auth-refresh';

export const parseAuthCookies = (cookieHeader: string): IAuthResponse => {
  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([name]) => name)
      .map(([name, ...value]) => [name, decodeURIComponent(value.join('='))]),
  );
  return {
    access_token: cookies.accessToken ?? null,
    refresh_token: cookies.refreshToken ?? null,
  };
};

export const runWithRefreshLock = async <T>(
  task: () => Promise<T>,
  lockManager?: {
    request: (name: string, callback: () => Promise<T>) => Promise<T>;
  },
): Promise<T> => {
  if (!lockManager) return task();
  return lockManager.request(REFRESH_LOCK_NAME, task);
};

export interface ISignUpByLogin extends IAuthByLogin {
  name: string;
}

export const useAuthStore = defineStore('auth', () => {
  const runtimeConfig = useRuntimeConfig();
  const event = useRequestEvent();
  const userStore = useUserStore();
  const wrappedFetch = useWrappedFetch();

  const accessToken = ref<Nullable<string>>(null);
  const refreshToken = ref<Nullable<string>>(null);
  const guestId = ref<Nullable<string>>(null);
  let refreshPromise: Promise<IAuthResponse> | null = null;
  let guestProfilePromise: Promise<void> | null = null;

  function applyDeleteCookie(
    name: 'accessToken' | 'refreshToken' | 'guest',
  ): void {
    if (import.meta.client) {
      document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    } else if (import.meta.server && event) {
      deleteCookie(event, name);
    }
  }

  async function logout() {
    await wrappedFetch('/auth/logout');
    clearTokens();
    userStore.clearProfile();
    await guestProfile();
    await multiNavigate('/', event);
  }

  async function deleteAccount() {
    await wrappedFetch('/user/profile', { method: 'DELETE' });
    clearTokens();
    userStore.clearProfile();
    useRoomStore().reset();
    await guestProfile();
    await multiNavigate('/', event);
  }

  async function signUpByLogin(data: ISignUpByLogin): Promise<void> {
    const response = await wrappedFetch<IAuthResponse>('/auth/sign-up', {
      method: 'POST',
      skipGuestBootstrap: true,
      body: {
        ...data,
        provider: EAuthProvider.local,
      },
    });
    setTokens(response);
    await userStore.getProfile();
    await recordPrivacyConsent();
    await multiNavigate('/', event);
  }

  async function recordPrivacyConsent(): Promise<void> {
    await wrappedFetch('/consent', {
      method: 'POST',
      body: { purpose: 'privacy', version: '2026-07-19', granted: true },
    });
  }

  async function signInByLogin(data: IAuthByLogin): Promise<void> {
    const response = await wrappedFetch<IAuthResponse>('/auth/sign-in', {
      method: 'POST',
      skipGuestBootstrap: true,
      body: {
        ...data,
        provider: EAuthProvider.local,
      },
    });
    setTokens(response);
    await userStore.getProfile();
    await multiNavigate('/', event);
  }

  function applySetCookie(
    name: 'accessToken' | 'refreshToken' | 'guest',
    value: string,
  ): void {
    const exp =
      name === 'guest'
        ? 86400 * 30
        : name === 'accessToken'
          ? runtimeConfig.public.cookie.ate
          : runtimeConfig.public.cookie.rte;
    if (import.meta.client) {
      document.cookie = `${name}=${value}; path=/; max-age=${exp}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    } else if (import.meta.server && event) {
      setCookie(event, name, value, {
        maxAge: +exp,
        path: '/',
        sameSite: 'lax',
        secure: String(runtimeConfig.public.siteUrl).startsWith('https://'),
      });
    }
  }
  function setTokens({
    access_token,
    refresh_token,
    guest_id,
  }: IAuthResponse): void {
    if (access_token) {
      accessToken.value = access_token;
      applySetCookie('accessToken', access_token);
    }
    if (refresh_token) {
      refreshToken.value = refresh_token;
      applySetCookie('refreshToken', refresh_token);
    }
    if (guest_id) {
      guestId.value = guest_id;
      applySetCookie('guest', guest_id);
    }
  }

  function readClientTokens(): IAuthResponse {
    return import.meta.client ? parseAuthCookies(document.cookie) : {};
  }

  function restoreUpdatedClientTokens(
    previousAccessToken: Nullable<string>,
    previousRefreshToken: Nullable<string>,
  ): IAuthResponse | null {
    if (!import.meta.client) return null;
    const current = readClientTokens();
    if (
      !current.access_token ||
      !current.refresh_token ||
      (current.access_token === previousAccessToken &&
        current.refresh_token === previousRefreshToken)
    ) {
      return null;
    }
    accessToken.value = current.access_token;
    refreshToken.value = current.refresh_token;
    return current;
  }

  function recoverTokensFromUpdatedCookies(
    previousRefreshToken: Nullable<string>,
  ): IAuthResponse | null {
    return restoreUpdatedClientTokens(accessToken.value, previousRefreshToken);
  }

  function clearTokens(): void {
    accessToken.value = null;
    refreshToken.value = null;
    applyDeleteCookie('accessToken');
    applyDeleteCookie('refreshToken');
  }

  async function refreshSession(): Promise<IAuthResponse> {
    if (!refreshToken.value) throw new Error('Refresh token is missing');
    if (!refreshPromise) {
      const previousAccessToken = accessToken.value;
      const previousRefreshToken = refreshToken.value;
      const refresh = async (): Promise<IAuthResponse> => {
        const restored = restoreUpdatedClientTokens(
          previousAccessToken,
          previousRefreshToken,
        );
        if (restored) return restored;
        const currentRefreshToken =
          readClientTokens().refresh_token ?? refreshToken.value;
        if (!currentRefreshToken) throw new Error('Refresh token is missing');
        const response = await $fetch<IAuthResponse>(
          runtimeConfig.public.API_URL + '/auth/refresh',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${currentRefreshToken}` },
          },
        );
        setTokens(response);
        return response;
      };
      refreshPromise = runWithRefreshLock<IAuthResponse>(
        refresh,
        import.meta.client ? navigator.locks : undefined,
      ).finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise!;
  }

  async function signInByGoogle(code: string): Promise<boolean> {
    return await wrappedFetch<IAuthResponse>('/auth/sign-up', {
      method: 'POST',
      skipGuestBootstrap: true,
      body: { google_code: code, provider: EAuthProvider.google },
    })
      .then((data) => setTokens(data))
      .then(() => userStore.getProfile())
      .then(() => true)
      .catch(() => false);
  }

  async function loadTokensFromCookie(req: H3Event): Promise<void> {
    if (import.meta.server) {
      try {
        const cookies = parseCookies(req);
        setTokens({
          access_token: cookies.accessToken,
          refresh_token: cookies.refreshToken,
          guest_id: cookies.guest,
        });
        if (!cookies.accessToken && cookies.refreshToken) {
          try {
            await refreshSession();
          } catch {
            clearTokens();
          }
        }
        if (!accessToken.value && guestId.value) {
          await guestProfile();
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  async function guestProfile(): Promise<void> {
    try {
      const response = await wrappedFetch<IGuestResponse>(`/auth/guest`, {
        method: 'POST',
        skipGuestBootstrap: true,
      });
      if (response._id) {
        guestId.value = response._id;
        applySetCookie('guest', response._id);
        userStore.profile = response;
      } else {
        await multiNavigate('/error/500', event);
      }
    } catch {
      await multiNavigate('/error/500', event);
    }
  }

  async function ensureGuestProfile(): Promise<void> {
    if (accessToken.value || (guestId.value && userStore.profile)) return;
    if (!guestProfilePromise) {
      guestProfilePromise = guestProfile().finally(() => {
        guestProfilePromise = null;
      });
    }
    await guestProfilePromise;
    if (!guestId.value) throw new Error('Guest profile is unavailable');
  }

  return {
    accessToken,
    refreshToken,
    guestId,
    clearTokens,
    loadTokensFromCookie,
    signInByGoogle,
    signUpByLogin,
    recordPrivacyConsent,
    logout,
    deleteAccount,
    signInByLogin,
    setTokens,
    refreshSession,
    recoverTokensFromUpdatedCookies,
    guestProfile,
    ensureGuestProfile,
  };
});
