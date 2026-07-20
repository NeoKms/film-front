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
    `Sitemap: ${siteUrl}/sitemap.xml`,
  ].join('\n');
});
