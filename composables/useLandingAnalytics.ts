import type { SeoIntentAnalyticsSource } from '~/types';

type LandingAnalyticsSource = 'home' | SeoIntentAnalyticsSource;
type LandingCtaSource = 'hero' | 'middle' | 'result' | 'final';

const SCROLL_DEPTHS = [25, 50, 75, 100] as const;

export const useLandingAnalytics = (page: LandingAnalyticsSource) => {
  const { consent, track } = useProductAnalytics();
  const trackedDepths = new Set<number>();
  let demoTracked = false;

  const trackCreate = (source: LandingCtaSource) =>
    track('landing_create_click', { page, source });

  const trackDemo = () => {
    if (demoTracked) return;
    track('landing_demo_interaction', { page });
    if (consent.value) demoTracked = true;
  };

  const trackFaq = (index: number) =>
    track('landing_faq_open', { page, item: index + 1 });

  const trackScrollDepth = () => {
    if (!import.meta.client || !consent.value) return;
    const scrollable = document.documentElement.scrollHeight;
    if (!scrollable) return;
    const depth = Math.min(
      100,
      Math.round(((window.scrollY + window.innerHeight) / scrollable) * 100),
    );
    for (const threshold of SCROLL_DEPTHS) {
      if (depth < threshold || trackedDepths.has(threshold)) continue;
      track('landing_scroll_depth', { page, depth: threshold });
      trackedDepths.add(threshold);
    }
  };

  onMounted(() => {
    window.addEventListener('scroll', trackScrollDepth, { passive: true });
    trackScrollDepth();
  });
  onBeforeUnmount(() => window.removeEventListener('scroll', trackScrollDepth));
  watch(consent, (allowed) => {
    if (allowed) nextTick(trackScrollDepth);
  });

  return { trackCreate, trackDemo, trackFaq };
};
