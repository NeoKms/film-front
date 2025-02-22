<script setup lang="ts">
const route = useRoute();
const config = useRuntimeConfig();
const filmStore = useFilmStore();
const roomStore = useRoomStore();
const { track } = useProductAnalytics();
const creating = ref(false);
const { data: film } = await useAsyncData(
  `shared-film-${route.params.id}`,
  () => filmStore.getById(String(route.params.id)),
);
if (!film.value)
  throw createError({ statusCode: 404, statusMessage: 'Film not found' });

const pageOrigin = String(config.public.siteUrl).replace(/\/$/, '');
const canonicalOrigin = String(
  config.public.deploymentEnvironment === 'beta'
    ? 'https://film-together.com'
    : config.public.siteUrl,
).replace(/\/$/, '');
const shareUrl = `${pageOrigin}/share/${film.value._id}`;
const canonicalUrl = `${canonicalOrigin}/share/${film.value._id}`;
const ogImage = `${pageOrigin}/share-card.svg?name=${encodeURIComponent(film.value.name)}&year=${film.value.year}`;
useSeoMeta({
  title: `${film.value.name} (${film.value.year})`,
  description: `Мы выбрали «${film.value.name}» в Film Together. Выберите фильм своей компанией.`,
  robots: 'noindex, nofollow',
  ogTitle: `${film.value.name} (${film.value.year}) — Film Together`,
  ogDescription:
    'Мы выбрали этот фильм вместе. Найдите общий фильм своей компанией.',
  ogUrl: shareUrl,
  ogImage,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterCard: 'summary_large_image',
});
useHead({ link: [{ rel: 'canonical', href: canonicalUrl }] });

const createRoom = async () => {
  creating.value = true;
  track('share_page_create_click');
  try {
    const room = await roomStore.createRoom();
    await navigateTo(`/room/${room._id}`);
  } finally {
    creating.value = false;
  }
};
onMounted(() => track('share_page_opened'));
</script>

<template>
  <main
    class="mx-auto grid min-h-[calc(100dvh-8rem)] w-full max-w-5xl items-center gap-8 px-5 py-12 lg:grid-cols-[20rem_1fr]"
  >
    <film-poster
      :src="film!.poster_url"
      :alt="film!.name"
      class="mx-auto aspect-[2/3] w-full max-w-xs rounded-[2rem] shadow-2xl shadow-black/50"
    />
    <section class="text-center lg:text-left">
      <p
        class="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300"
      >
        Выбрано вместе в Film Together
      </p>
      <h1 class="mt-4 text-4xl font-semibold text-white sm:text-6xl">
        {{ film!.name }}
      </h1>
      <p class="mt-3 text-xl text-zinc-400">{{ film!.year }}</p>
      <p
        class="mx-auto mt-6 max-w-xl text-base leading-7 text-zinc-400 lg:mx-0"
      >
        Создайте комнату, пригласите друзей и свайпайте независимо — сервис
        покажет фильмы, которые выбрали все.
      </p>
      <button
        type="button"
        class="mt-8 min-h-14 rounded-2xl bg-amber-300 px-7 font-semibold text-zinc-950 disabled:opacity-50"
        :disabled="creating"
        @click="createRoom"
      >
        Выбрать фильм своей компанией
      </button>
    </section>
  </main>
</template>
