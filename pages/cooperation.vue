<script setup lang="ts">
const config = useRuntimeConfig();
const email = computed(() => String(config.public.legalEmail || ''));
const mailto = computed(() => {
  if (!email.value) return '';
  const subject = encodeURIComponent('Предложение о сотрудничестве — Film Together');
  return `mailto:${email.value}?subject=${subject}`;
});

usePublicSeo({
  path: '/cooperation',
  title: 'Сотрудничество с Film Together',
  description:
    'Партнёрства, совместные материалы, промо и другие идеи для сервиса совместного выбора фильмов Film Together.',
  ogTitle: 'Сотрудничество с Film Together',
  ogDescription:
    'Расскажите об идее партнёрства, совместного материала, промо или другого проекта для Film Together.',
  structuredData: ({ canonicalUrl }) => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Сотрудничество с Film Together',
    description:
      'Возможности сотрудничества с сервисом совместного выбора фильмов Film Together.',
    url: canonicalUrl,
    inLanguage: 'ru-RU',
  }),
});

const formats = [
  {
    title: 'Партнёрские проекты',
    text: 'Совместные механики, спецпроекты и идеи для брендов, сообществ и мероприятий.',
  },
  {
    title: 'Контент и медиа',
    text: 'Тематические подборки, редакционные материалы и полезные форматы для аудитории.',
  },
  {
    title: 'Промо и интеграции',
    text: 'Нативные способы рассказать о проекте или продукте без ущерба для опыта пользователей.',
  },
];
</script>

<template>
  <main>
    <section class="relative isolate overflow-hidden px-5 py-16 sm:py-24">
      <div class="pointer-events-none absolute inset-0 cinematic-grid" />
      <div class="relative mx-auto max-w-5xl">
        <NuxtLink to="/" class="text-sm text-zinc-500 transition hover:text-white">
          ← На главную
        </NuxtLink>
        <p class="mt-12 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
          Сотрудничество
        </p>
        <h1 class="mt-4 max-w-4xl text-balance text-4xl font-semibold leading-tight text-white sm:text-6xl">
          Есть идея для Film Together? Давайте обсудим.
        </h1>
        <p class="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
          Мы открыты к предложениям, которые помогают людям легче выбирать кино вместе и делают этот опыт интереснее.
        </p>
        <a
          v-if="mailto"
          :href="mailto"
          class="mt-8 inline-flex min-h-14 items-center rounded-2xl bg-amber-300 px-7 font-semibold text-zinc-950 transition hover:bg-amber-200"
        >
          Написать о предложении
        </a>
      </div>
    </section>

    <section class="border-y border-white/5 bg-white/[0.02] px-5 py-16">
      <div class="mx-auto max-w-5xl">
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
          Возможные форматы
        </p>
        <h2 class="mt-3 text-3xl font-medium text-white sm:text-4xl">
          От понятного партнёрства до нестандартной идеи
        </h2>
        <div class="mt-8 grid gap-4 md:grid-cols-3">
          <article
            v-for="item in formats"
            :key="item.title"
            class="rounded-3xl border border-white/10 bg-[#11141a] p-6"
          >
            <h3 class="text-xl font-medium text-white">{{ item.title }}</h3>
            <p class="mt-3 text-sm leading-6 text-zinc-400">{{ item.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="px-5 py-16 sm:py-20">
      <div class="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:items-start">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
            Как начать
          </p>
          <h2 class="mt-3 text-3xl font-medium text-white">Расскажите главное</h2>
          <p class="mt-5 text-base leading-8 text-zinc-400">
            Напишите, кто вы, в чём состоит идея и какой результат вы предлагаете получить вместе. Если формат не укладывается в примеры выше — это не проблема.
          </p>
        </div>
        <div class="rounded-[2rem] border border-amber-300/20 bg-amber-300/[0.06] p-7">
          <h2 class="text-2xl font-medium text-white">Открыты к разговору</h2>
          <p class="mt-3 text-sm leading-7 text-zinc-400">
            Каждое предложение рассматривается по смыслу и пользе для аудитории Film Together. Готовых пакетов и обязательных форматов нет.
          </p>
          <a
            v-if="mailto"
            :href="mailto"
            class="mt-6 inline-flex min-h-12 items-center text-sm font-semibold text-amber-300"
          >
            Отправить письмо →
          </a>
          <p v-else class="mt-6 text-sm text-zinc-500">
            Контактный адрес временно недоступен.
          </p>
        </div>
      </div>
    </section>
  </main>
</template>
