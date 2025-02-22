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
    class="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-white/15 bg-[#151820]/95 p-4 shadow-2xl backdrop-blur-xl sm:flex sm:items-center sm:gap-5"
    aria-label="Уведомление об использовании cookie"
  >
    <p class="text-xs leading-5 text-zinc-300 sm:flex-1">
      Необходимые cookie обеспечивают вход, гостевую сессию и комнаты. Аналитика
      посещений включается только с вашего согласия. Подробнее — в
      <NuxtLink
        to="/legal/cookies"
        class="text-amber-300 underline underline-offset-2"
        >политике cookie</NuxtLink
      >.
    </p>
    <div class="mt-3 flex shrink-0 flex-col items-stretch gap-1.5 sm:mt-0">
      <button
        type="button"
        class="min-h-11 rounded-xl bg-amber-300 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200"
        @click="saveChoice(true)"
      >
        Принять все
      </button>
      <button
        type="button"
        class="min-h-8 px-2 text-xs text-zinc-400 underline decoration-zinc-700 underline-offset-2 transition hover:text-zinc-200"
        @click="saveChoice(false)"
      >
        Только необходимые
      </button>
    </div>
  </aside>
</template>
