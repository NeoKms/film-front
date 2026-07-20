<script setup lang="ts">
definePageMeta({
  layout: 'error',
});

useSeoMeta({
  title: 'Ошибка сервиса — Movie Matcher',
  robots: 'noindex, nofollow',
});
</script>

<template>
  <main
    class="flex min-h-dvh items-center justify-center bg-slate-950 px-5 py-10 text-slate-100"
  >
    <section
      class="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-center shadow-2xl shadow-black/30 sm:p-8"
    >
      <p class="text-sm font-bold uppercase tracking-[0.3em] text-rose-400">Ошибка 500</p>
      <h1 class="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
        Сервис временно недоступен
      </h1>
      <p class="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
        Попробуйте обновить страницу через несколько минут или вернитесь на главную.
      </p>

      <div class="mt-7 grid gap-3 sm:grid-cols-2">
        <DesignSystemButton variant="secondary" class="w-full" @click="$router.go(0)">
          Обновить
        </DesignSystemButton>
        <DesignSystemButton class="w-full" @click="$router.push('/')">
          На главную
        </DesignSystemButton>
      </div>
    </section>
  </main>
</template>
