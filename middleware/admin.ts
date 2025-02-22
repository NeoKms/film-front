export default defineNuxtRouteMiddleware(async () => {
  const authStore = useAuthStore();
  const userStore = useUserStore();

  if (!authStore.accessToken) return navigateTo('/sign-in');
  if (!userStore.profile) await userStore.getProfile();
  if (!userStore.profile?.roles.includes('admin')) return navigateTo('/');
});
