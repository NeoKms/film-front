import type { SeoFaqItem } from '~/types';
import {
  buildAbsoluteUrl,
  DEFAULT_OG_IMAGE_PATH,
  PRODUCTION_SITE_URL,
} from '~/utils/seo';

interface PublicSeoContext {
  canonicalUrl: string;
  publicUrl: string;
  imageUrl: string;
}

interface PublicSeoOptions {
  path: string;
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  imagePath?: string;
  imageAlt?: string;
  structuredData?: (context: PublicSeoContext) => Record<string, unknown>;
}

export const buildFaqEntities = (items: SeoFaqItem[]) =>
  items.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  }));

export const usePublicSeo = (options: PublicSeoOptions) => {
  const config = useRuntimeConfig();
  const actualOrigin = computed(() =>
    String(config.public.siteUrl || 'http://localhost:3000').replace(/\/$/, ''),
  );
  const canonicalOrigin = computed(() =>
    config.public.deploymentEnvironment === 'production'
      ? actualOrigin.value
      : PRODUCTION_SITE_URL,
  );
  const canonicalUrl = computed(() =>
    buildAbsoluteUrl(canonicalOrigin.value, options.path),
  );
  const publicUrl = computed(() =>
    buildAbsoluteUrl(actualOrigin.value, options.path),
  );
  const imageUrl = computed(() =>
    buildAbsoluteUrl(
      actualOrigin.value,
      options.imagePath ?? DEFAULT_OG_IMAGE_PATH,
    ),
  );
  const robots = computed(() =>
    config.public.deploymentEnvironment === 'production'
      ? 'index, follow'
      : 'noindex, nofollow, noarchive',
  );

  useSeoMeta({
    title: options.title,
    description: options.description,
    robots,
    ogTitle: options.ogTitle ?? options.title,
    ogDescription: options.ogDescription ?? options.description,
    ogUrl: publicUrl,
    ogImage: imageUrl,
    ogImageAlt: options.imageAlt ?? 'Film Together — совместный выбор фильма',
    twitterTitle: options.ogTitle ?? options.title,
    twitterDescription: options.ogDescription ?? options.description,
    twitterImage: imageUrl,
    twitterImageAlt:
      options.imageAlt ?? 'Film Together — совместный выбор фильма',
  });

  useHead(() => ({
    link: [{ rel: 'canonical', href: canonicalUrl.value }],
    script: options.structuredData
      ? [
          {
            type: 'application/ld+json',
            innerHTML: JSON.stringify(
              options.structuredData({
                canonicalUrl: canonicalUrl.value,
                publicUrl: publicUrl.value,
                imageUrl: imageUrl.value,
              }),
            ),
          },
        ]
      : [],
  }));

  return { canonicalUrl, imageUrl, publicUrl };
};
