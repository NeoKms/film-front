import { useAuthStore } from '~/stores/auth';
import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack';

export const useWrappedFetch = () => {
  const authStore = useAuthStore();
  const notificationStore = useNotificationStore();
  const runtimeConfig = useRuntimeConfig();

  return async function wrappedFetch<DefaultT = unknown>(
    path: string,
    options: Omit<NitroFetchOptions<NitroFetchRequest>, 'headers'> & {
      headers?: Record<string, string>;
      skipAuthRefresh?: boolean;
    } = {},
  ): Promise<DefaultT> {
    const url = runtimeConfig.public.API_URL + path;
    const { skipAuthRefresh = false, ...fetchOptions } = options;
    fetchOptions.timeout ??= 12_000;

    if (runtimeConfig.public.debug) {
      await sleep(1000);
    }
    try {
      const authStore = useAuthStore();
      if (!fetchOptions?.headers?.['Authorization'] && authStore.accessToken) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          Authorization: `Bearer ${authStore.accessToken}`,
        };
      }
      if (!fetchOptions?.headers?.['X-GUEST-ID'] && authStore.guestId) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'X-GUEST-ID': authStore.guestId,
        };
      }
      return (await $fetch<DefaultT>(url, fetchOptions)) as DefaultT;
    } catch (error: unknown) {
      const httpError = error as {
        response?: {
          status: number;
          _data?: { error?: string; message?: string };
        };
      };
      if (
        httpError.response?.status === 401 &&
        authStore.refreshToken &&
        !skipAuthRefresh
      ) {
        try {
          const response = await authStore.refreshSession();
          fetchOptions.headers = {
            ...fetchOptions.headers,
            Authorization: `Bearer ${response.access_token}`,
          };
          return (await $fetch<DefaultT>(url, fetchOptions)) as DefaultT;
        } catch {
          authStore.clearTokens();
          if (import.meta.client) {
            await navigateTo('/sign-in');
          }
          throw error;
        }
      } else {
        if (import.meta.client && httpError.response) {
          const errorText =
            httpError.response._data?.error ||
            httpError.response._data?.message ||
            'Не удалось выполнить запрос';
          const status = httpError.response.status;
          if (status >= 500) {
            notificationStore.addNotification(
              'Сервис временно недоступен',
              'error',
              3000,
            );
          } else if ([400, 403, 404].includes(status)) {
            notificationStore.addNotification(errorText, 'error', 3000);
          }
        } else if (import.meta.client) {
          notificationStore.addNotification(
            'Нет связи с сервером',
            'error',
            3000,
          );
        }
        throw error;
      }
    }
  };
};
