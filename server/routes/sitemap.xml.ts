import { INDEXABLE_ROUTES } from '../../utils/seo';

const escapeXml = (value: string) =>
  value.replace(
    /[<>&'"]/g,
    (character) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;',
      })[character]!,
  );

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  if (config.public.deploymentEnvironment !== 'production') {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }
  const siteUrl = config.public.siteUrl.replace(/\/$/, '');
  setHeader(event, 'content-type', 'application/xml; charset=utf-8');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${INDEXABLE_ROUTES.map((route) => `  <url><loc>${escapeXml(`${siteUrl}${route}`)}</loc></url>`).join('\n')}
</urlset>`;
});
