export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const siteUrl = config.public.siteUrl.replace(/\/$/, '');
  setHeader(event, 'content-type', 'text/plain; charset=utf-8');
  if (config.public.deploymentEnvironment !== 'production') {
    return ['User-agent: *', 'Disallow: /'].join('\n');
  }
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /room/',
    'Disallow: /film/',
    'Disallow: /share/',
    'Disallow: /profile',
    'Disallow: /admin',
    'Disallow: /sign-in',
    'Disallow: /signup',
    'Disallow: /oauth2',
    `Sitemap: ${siteUrl}/sitemap.xml`,
  ].join('\n');
});
