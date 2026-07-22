<script setup lang="ts">
definePageMeta({
  layout: 'error',
});

useSeoMeta({
  title: 'Ошибка сервиса — Film Together',
  robots: 'noindex, nofollow',
});

const authStore = useAuthStore();
const retrying = ref(false);
const retryFailed = ref(false);

const retryService = async () => {
  retrying.value = true;
  retryFailed.value = false;
  try {
    await authStore.ensureGuestProfile();
    await navigateTo('/');
  } catch {
    retryFailed.value = true;
  } finally {
    retrying.value = false;
  }
};
</script>

<template>
  <main
    class="flex min-h-dvh items-center justify-center bg-slate-950 px-5 py-10 text-slate-100"
  >
    <section
      class="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-center shadow-2xl shadow-black/30 sm:p-8"
    >
      <p class="text-sm font-bold uppercase tracking-[0.3em] text-rose-400">
        Ошибка 500
      </p>
      <h1 class="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
        Сервис временно недоступен
      </h1>
      <p class="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
        Не получилось связаться с сервисом. Можно проверить соединение ещё раз
        или вернуться на главную.
      </p>

      <p
        v-if="retryFailed"
        role="status"
        class="mt-4 rounded-2xl bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
      >
        Сервис пока не отвечает. Попробуйте немного позже.
      </p>

      <div class="mt-7 grid gap-3 sm:grid-cols-2">
        <DesignSystemButton
          variant="secondary"
          class="w-full"
          :loading="retrying"
          @click="retryService"
        >
          Попробовать снова
        </DesignSystemButton>
        <DesignSystemButton class="w-full" @click="$router.push('/')">
          На главную
        </DesignSystemButton>
      </div>
    </section>
  </main>
</template>
