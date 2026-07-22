<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();
const statusCode = computed(() => Number(props.error.statusCode || 500));
const isNotFound = computed(() => statusCode.value === 404);
const title = computed(() =>
  isNotFound.value ? 'Страница не найдена' : 'Что-то пошло не так',
);
const description = computed(() =>
  isNotFound.value
    ? 'Такой страницы нет или ссылка уже неактуальна.'
    : 'Не получилось открыть страницу. Вернитесь на главную и попробуйте ещё раз.',
);

useHead({
  title: computed(() => `${title.value} · Film Together`),
  titleTemplate: null,
});
useSeoMeta({ robots: 'noindex, nofollow' });

const returnHome = () => clearError({ redirect: '/' });
</script>

<template>
  <main
    class="flex min-h-dvh items-center justify-center bg-[#0b0d12] px-5 py-10 text-zinc-100"
  >
    <section
      class="w-full max-w-md rounded-[2rem] border border-amber-300/20 bg-amber-300/[0.05] p-6 text-center shadow-2xl shadow-black/40 sm:p-8"
    >
      <NuxtLink
        to="/"
        class="mx-auto inline-flex min-h-10 items-center justify-center text-sm font-semibold uppercase tracking-[0.18em] text-white"
        @click="returnHome"
      >
        Film <span class="ml-1 text-amber-300">Together</span>
      </NuxtLink>
      <p
        class="mt-8 text-xs font-semibold uppercase tracking-[0.3em] text-amber-300"
      >
        Ошибка {{ statusCode }}
      </p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {{ title }}
      </h1>
      <p class="mt-3 text-sm leading-6 text-zinc-400 sm:text-base">
        {{ description }}
      </p>
      <a
        href="/"
        class="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-amber-300 px-5 font-semibold text-zinc-950 transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        @click="returnHome"
      >
        На главную
      </a>
    </section>
  </main>
</template>
