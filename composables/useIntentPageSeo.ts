import type { SeoIntentPage } from '~/types';
import { PRODUCTION_SITE_URL } from '~/utils/seo';

export const useIntentPageSeo = (page: SeoIntentPage) =>
  usePublicSeo({
    path: page.slug,
    title: page.title,
    description: page.description,
    ogTitle: page.ogTitle,
    ogDescription: page.ogDescription,
    structuredData: ({ canonicalUrl, imageUrl }) => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': `${canonicalUrl}#webpage`,
          url: canonicalUrl,
          name: page.title,
          description: page.description,
          inLanguage: 'ru-RU',
          primaryImageOfPage: { '@type': 'ImageObject', url: imageUrl },
          isPartOf: {
            '@type': 'WebSite',
            '@id': `${PRODUCTION_SITE_URL}/#website`,
            name: 'Film Together',
            url: `${PRODUCTION_SITE_URL}/`,
          },
          breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${canonicalUrl}#breadcrumb`,
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Film Together',
              item: `${PRODUCTION_SITE_URL}/`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: page.h1,
              item: canonicalUrl,
            },
          ],
        },
        {
          '@type': 'FAQPage',
          '@id': `${canonicalUrl}#faq`,
          mainEntity: buildFaqEntities(page.faq),
        },
      ],
    }),
  });
