import { multiNavigate } from '~/utils/helpers';

export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const authStore = useAuthStore();
  const event = useRequestEvent();

  if (authStore.accessToken) {
    return multiNavigate('/', event);
  }
});
