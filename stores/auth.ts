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

  function clearTokens(): void {
    accessToken.value = null;
    refreshToken.value = null;
    applyDeleteCookie('accessToken');
    applyDeleteCookie('refreshToken');
  }

  async function refreshSession(): Promise<IAuthResponse> {
    if (!refreshToken.value) throw new Error('Refresh token is missing');
    if (!refreshPromise) {
      const token = refreshToken.value;
      refreshPromise = $fetch<IAuthResponse>(
        runtimeConfig.public.API_URL + '/auth/refresh',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      )
        .then((response) => {
          setTokens(response);
          return response;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }
    return refreshPromise;
  }

  async function signInByGoogle(code: string): Promise<boolean> {
    return await wrappedFetch<IAuthResponse>('/auth/sign-up', {
      method: 'POST',
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
            await guestProfile();
          }
        } else if (!cookies.accessToken) {
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
    guestProfile,
  };
});
