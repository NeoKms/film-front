import { multiNavigate } from '~/utils/helpers';

export default defineNuxtRouteMiddleware(async (to) => {
  const { code } = to.query;
  const authStore = useAuthStore();
  const event = useRequestEvent();
  const googlePrivacyConsent = useCookie<boolean | null>(
    'google-privacy-consent',
  );

  if (authStore.accessToken) {
    return multiNavigate('/', event);
  } else {
    if (!code || googlePrivacyConsent.value !== true) {
      return multiNavigate('/sign-in', event);
    }
    const auth = await authStore.signInByGoogle(code as string);
    if (auth) {
      try {
        await authStore.recordPrivacyConsent();
        googlePrivacyConsent.value = null;
        return multiNavigate('/', event);
      } catch {
        authStore.clearTokens();
      }
    }
    googlePrivacyConsent.value = null;
    return multiNavigate('/sign-in', event);
  }
});
