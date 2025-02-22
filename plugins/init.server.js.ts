import { defineNuxtPlugin } from '#app';
import { useAuthStore } from '~/stores/auth';
import type { Pinia } from 'pinia';

export default defineNuxtPlugin(async (nuxtApp) => {
  const event = useRequestEvent();
  if (event?.path?.indexOf('error') !== -1) return;
  const authStore = useAuthStore(nuxtApp.$pinia as Pinia);
  if (event) await authStore.loadTokensFromCookie(event);
});
