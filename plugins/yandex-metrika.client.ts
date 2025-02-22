export default defineNuxtPlugin((nuxtApp) => {
  const { trackPageView } = useProductAnalytics();

  nuxtApp.hook('page:finish', () => trackPageView(location.href));
});
