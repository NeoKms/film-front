<script setup lang="ts">
import type { SeoIntentPage } from '~/types';
import { SEO_INTENT_PAGES } from '~/utils/seo-intent-pages';

const props = defineProps<{ page: SeoIntentPage }>();
useIntentPageSeo(props.page);

const roomStore = useRoomStore();
const loading = ref(false);
const { trackCreate, trackFaq } = useLandingAnalytics(
  props.page.analyticsSource,
);
const relatedPages = computed(() =>
  Object.values(SEO_INTENT_PAGES).filter(
    (candidate) => candidate.slug !== props.page.slug,
  ),
);

const createRoom = async (source: 'hero' | 'final') => {
  trackCreate(source);
  loading.value = true;
  try {
    const room = await roomStore.createRoom();
    await navigateTo(`/room/${room._id}`);
  } finally {
    loading.value = false;
  }
};

const onFaqToggle = (event: Event, index: number) => {
  if ((event.currentTarget as HTMLDetailsElement).open) trackFaq(index);
};
</script>

<template>
  <main>
    <section class="relative isolate overflow-hidden px-5 py-14 sm:py-20">
      <div class="pointer-events-none absolute inset-0 cinematic-grid" />
      <div class="relative mx-auto max-w-5xl">
        <nav
          class="flex flex-wrap items-center gap-2 text-xs text-zinc-500"
          aria-label="Хлебные крошки"
        >
          <NuxtLink to="/" class="transition hover:text-white"
            >Film Together</NuxtLink
          >
          <span aria-hidden="true">/</span>
          <span class="text-zinc-300">{{ page.h1 }}</span>
        </nav>

        <div class="mt-12 max-w-4xl">
          <p
            class="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300"
          >
            {{ page.eyebrow }}
          </p>
          <h1
            class="mt-4 text-balance text-4xl font-semibold leading-tight text-white sm:text-6xl"
          >
            {{ page.h1 }}
          </h1>
          <p class="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
            {{ page.lead }}
          </p>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              class="min-h-14 rounded-2xl bg-amber-300 px-7 font-semibold text-zinc-950 transition hover:bg-amber-200 disabled:opacity-50"
              :disabled="loading"
              @click="createRoom('hero')"
            >
              Создать комнату бесплатно
            </button>
            <NuxtLink
              to="/#start"
              class="inline-flex min-h-12 items-center justify-center px-4 text-sm text-zinc-400 transition hover:text-white"
            >
              Войти по коду →
            </NuxtLink>
          </div>
          <p class="mt-4 text-sm text-zinc-500">
            Работает в браузере · без установки · без обязательной регистрации
          </p>
        </div>
      </div>
    </section>

    <section class="border-y border-white/5 bg-white/[0.02] px-5 py-14">
      <div class="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
        <article
          v-for="benefit in page.benefits"
          :key="benefit.title"
          class="rounded-3xl border border-white/10 bg-[#11141a] p-6"
        >
          <h2 class="text-xl font-medium text-white">{{ benefit.title }}</h2>
          <p class="mt-3 text-sm leading-6 text-zinc-400">
            {{ benefit.text }}
          </p>
        </article>
      </div>
    </section>

    <section class="px-5 py-16 sm:py-20">
      <div class="mx-auto max-w-4xl space-y-16">
        <article v-for="section in page.sections" :key="section.title">
          <p
            class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300"
          >
            {{ section.eyebrow }}
          </p>
          <h2 class="mt-3 text-3xl font-medium text-white sm:text-4xl">
            {{ section.title }}
          </h2>
          <div class="mt-5 space-y-4 text-base leading-8 text-zinc-400">
            <p v-for="paragraph in section.paragraphs" :key="paragraph">
              {{ paragraph }}
            </p>
          </div>
          <ul v-if="section.bullets" class="mt-6 grid gap-3 sm:grid-cols-3">
            <li
              v-for="bullet in section.bullets"
              :key="bullet"
              class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-zinc-300"
            >
              {{ bullet }}
            </li>
          </ul>
        </article>
      </div>
    </section>

    <section class="border-y border-white/5 bg-white/[0.02] px-5 py-16">
      <div class="mx-auto max-w-4xl">
        <p
          class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300"
        >
          Как проходит выбор
        </p>
        <h2 class="mt-3 text-3xl font-medium text-white sm:text-4xl">
          От приглашения до итогового фильма
        </h2>
        <ol class="mt-8 grid gap-4 md:grid-cols-3">
          <li
            v-for="(step, index) in [
              [
                'Создайте комнату',
                'Укажите имя и подготовьте фильтры или подборки.',
              ],
              [
                'Пригласите участников',
                'Отправьте ссылку, QR-код или шестизначный код.',
              ],
              [
                'Выбирайте независимо',
                'Общие положительные решения появятся в matches.',
              ],
            ]"
            :key="step[0]"
            class="rounded-3xl border border-white/10 p-5"
          >
            <span class="font-mono text-sm text-amber-300"
              >0{{ index + 1 }}</span
            >
            <h3 class="mt-6 text-lg text-white">{{ step[0] }}</h3>
            <p class="mt-2 text-sm leading-6 text-zinc-500">{{ step[1] }}</p>
          </li>
        </ol>
      </div>
    </section>

    <section class="px-5 py-16">
      <div class="mx-auto max-w-3xl">
        <p
          class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300"
        >
          FAQ
        </p>
        <h2 class="mt-3 text-3xl font-medium text-white">Частые вопросы</h2>
        <div class="mt-8 divide-y divide-white/10">
          <details
            v-for="(item, index) in page.faq"
            :key="item.question"
            class="group py-5"
            @toggle="onFaqToggle($event, index)"
          >
            <summary
              class="flex cursor-pointer list-none items-center justify-between gap-4 text-lg text-white"
            >
              <span>{{ item.question }}</span>
              <span class="text-zinc-600 transition group-open:rotate-45"
                >+</span
              >
            </summary>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              {{ item.answer }}
            </p>
          </details>
        </div>
      </div>
    </section>

    <section class="px-5 pb-16">
      <div class="mx-auto max-w-5xl">
        <h2 class="text-2xl font-medium text-white">Другие сценарии выбора</h2>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <NuxtLink
            v-for="related in relatedPages"
            :key="related.slug"
            :to="related.slug"
            class="rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-amber-300/30 hover:bg-amber-300/[0.04]"
          >
            <span class="text-lg text-white">{{ related.h1 }}</span>
            <span class="mt-2 block text-sm leading-6 text-zinc-500">
              {{ related.description }}
            </span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="px-5 pb-20">
      <div
        class="mx-auto max-w-5xl rounded-[2rem] bg-amber-300 p-7 text-zinc-950 sm:p-10"
      >
        <h2 class="text-3xl font-semibold sm:text-4xl">{{ page.ctaTitle }}</h2>
        <p class="mt-3 max-w-2xl text-sm leading-6 opacity-70">
          {{ page.ctaText }}
        </p>
        <button
          type="button"
          class="mt-7 min-h-14 rounded-2xl bg-zinc-950 px-7 font-semibold text-white disabled:opacity-50"
          :disabled="loading"
          @click="createRoom('final')"
        >
          Начать выбор
        </button>
      </div>
    </section>
  </main>
</template>
