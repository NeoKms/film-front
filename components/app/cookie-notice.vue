<script setup lang="ts">
const acknowledged = useCookie<boolean | null>('cookie-notice-acknowledged', {
  default: () => null,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
});
const { setConsent } = useProductAnalytics();
const wrappedFetch = useWrappedFetch();
const saveChoice = async (allowAnalytics: boolean) => {
  setConsent(allowAnalytics);
  acknowledged.value = true;
  try {
    await wrappedFetch('/consent', {
      method: 'POST',
      body: {
        purpose: 'analytics',
        version: '2026-07-19',
        granted: allowAnalytics,
      },
    });
  } catch {
    // Consent is applied locally even if the append-only audit write is temporarily unavailable.
  }
};
</script>

<template>
  <aside
    v-if="!acknowledged"
    class="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-white/15 bg-[#151820]/95 p-3 shadow-2xl backdrop-blur-xl sm:flex sm:items-center sm:gap-5 sm:p-4"
    aria-label="Уведомление об использовании cookie"
  >
    <p
      class="text-[11px] leading-4 text-zinc-300 sm:flex-1 sm:text-xs sm:leading-5"
    >
      <span class="sm:hidden">
        Необходимые cookie работают всегда. Аналитику включим только с вашего
        согласия.
      </span>
      <span class="hidden sm:inline">
        Необходимые cookie обеспечивают вход, гостевую сессию и комнаты.
        Аналитика посещений включается только с вашего согласия.
      </span>
      Подробнее — в
      <NuxtLink
        to="/legal/cookies"
        class="text-amber-300 underline underline-offset-2"
        >политике cookie</NuxtLink
      >.
    </p>
    <div
      class="mt-2 grid shrink-0 grid-cols-2 items-stretch gap-2 sm:mt-0 sm:flex sm:flex-col sm:gap-1.5"
    >
      <button
        type="button"
        class="min-h-10 rounded-xl bg-amber-300 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-amber-200 sm:min-h-11 sm:px-6 sm:text-sm"
        @click="saveChoice(true)"
      >
        Принять все
      </button>
      <button
        type="button"
        class="min-h-10 px-1 text-[11px] leading-4 text-zinc-300 underline decoration-zinc-600 underline-offset-2 transition hover:text-white sm:min-h-8 sm:px-2 sm:text-xs"
        @click="saveChoice(false)"
      >
        Только необходимые
      </button>
    </div>
  </aside>
</template>
