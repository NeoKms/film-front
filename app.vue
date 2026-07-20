<script setup lang="ts">
import { buildAbsoluteUrl, DEFAULT_OG_IMAGE_PATH } from '~/utils/seo';

const config = useRuntimeConfig();
const defaultOgImage = computed(() =>
  buildAbsoluteUrl(
    String(config.public.siteUrl || 'http://localhost:3000'),
    DEFAULT_OG_IMAGE_PATH,
  ),
);

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: '#0b0d12' },
    {
      name: 'description',
      content: 'Выберите фильм вместе — без регистрации и долгих споров.',
    },
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      href: '/favicon-32x32.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      href: '/favicon-16x16.png',
    },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      href: '/apple-touch-icon.png',
    },
    { rel: 'manifest', href: '/site.webmanifest' },
    { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: '#fbbf24' },
  ],
  htmlAttrs: {
    lang: 'ru',
  },
  titleTemplate: (title) =>
    title ? `${title} · Film Together` : 'Film Together',
});
useSeoMeta({
  robots: computed(() =>
    config.public.deploymentEnvironment === 'production'
      ? undefined
      : 'noindex, nofollow, noarchive',
  ),
  ogSiteName: 'Film Together',
  ogType: 'website',
  ogLocale: 'ru_RU',
  ogImage: defaultOgImage,
  ogImageAlt: 'Film Together — совместный выбор фильма',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterCard: 'summary_large_image',
  twitterImage: defaultOgImage,
  twitterImageAlt: 'Film Together — совместный выбор фильма',
});
</script>
<template>
  <div>
    <NuxtLoadingIndicator />
    <NotificationSnackbar />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
