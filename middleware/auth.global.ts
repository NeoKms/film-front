import { multiNavigate } from '~/utils/helpers';

export default defineNuxtRouteMiddleware(async (to, _from) => {
  const event = useRequestEvent();
  const excludedRoutes = ['/signup', '/sign-in', '/oauth2'];
  if (excludedRoutes.includes(to.path)) {
    return;
  }
  const authStore = useAuthStore();
  if (authStore.accessToken) {
    const userStore = useUserStore();
    if (!userStore.profile) {
      try {
        await userStore.getProfile();
      } catch {
        return multiNavigate('/sign-in', event);
      }
    }
  }
});
