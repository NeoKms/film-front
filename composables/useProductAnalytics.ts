export type ProductGoal =
  | 'landing_create_click'
  | 'room_created'
  | 'join_submit'
  | 'join_success'
  | 'filters_open'
  | 'filters_saved'
  | 'collection_selected'
  | 'room_started'
  | 'first_decision'
  | 'match_received'
  | 'matches_opened'
  | 'final_film_selected'
  | 'result_shared'
  | 'share_page_opened'
  | 'share_page_create_click'
  | 'room_repeated'
  | 'signup_started'
  | 'signup_completed';

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void;
  }
}

export const useProductAnalytics = () => {
  const config = useRuntimeConfig();
  const consent = useCookie<boolean | null>('analytics-consent', {
    default: () => null,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  const counterId = Number(config.public.yandexMetrikaId || 0);
  const enabled = computed(() => import.meta.env.PROD && Boolean(counterId));
  const loaded = useState('yandex-metrika-loaded', () => false);
  const lastTrackedUrl = useState<string | null>(
    'yandex-metrika-last-url',
    () => null,
  );

  const deleteFirstPartyAnalyticsCookies = () => {
    if (!import.meta.client) return;
    document.cookie.split(';').forEach((part) => {
      const name = part.split('=')[0]?.trim();
      if (!name?.startsWith('_ym_')) return;
      document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    });
  };

  const sendPageView = (url: string, referer: string) => {
    if (lastTrackedUrl.value === url) return;
    window.ym?.(counterId, 'hit', url, {
      title: document.title,
      referer,
    });
    lastTrackedUrl.value = url;
  };

  const load = () => {
    if (!import.meta.client || !enabled.value || !consent.value) return;
    if (loaded.value) return;
    loaded.value = true;
    const ym = (window.ym ??= (...args: unknown[]) => {
      ((ym as unknown as { a?: unknown[] }).a ??= []).push(args);
    });
    (ym as unknown as { l?: number }).l = Date.now();
    ym(counterId, 'init', {
      defer: true,
      ssr: true,
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      referrer: document.referrer,
      url: location.href,
    });
    const scriptId = `yandex-metrika-${counterId}`;
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.src = `https://mc.yandex.ru/metrika/tag.js?id=${counterId}`;
      document.head.appendChild(script);
    }
    sendPageView(location.href, document.referrer);
  };

  const disable = () => {
    if (!import.meta.client) return;
    if (loaded.value) window.ym?.(counterId, 'destruct');
    loaded.value = false;
    lastTrackedUrl.value = null;
    deleteFirstPartyAnalyticsCookies();
  };

  const setConsent = (allowed: boolean) => {
    consent.value = allowed;
    if (allowed) load();
    else disable();
  };

  const trackPageView = (url = location.href) => {
    if (!import.meta.client || !enabled.value || !consent.value) return;
    const referer = lastTrackedUrl.value || document.referrer;
    load();
    sendPageView(url, referer);
  };

  const track = (goal: ProductGoal) => {
    if (!import.meta.client || !enabled.value || !consent.value) return;
    load();
    window.ym?.(counterId, 'reachGoal', goal, {
      environment: String(config.public.analyticsEnvironment || 'unknown'),
    });
  };

  watch(
    consent,
    (allowed) => {
      if (allowed) load();
      else disable();
    },
    { immediate: true },
  );
  return { consent, enabled, load, setConsent, track, trackPageView };
};
