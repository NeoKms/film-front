export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  if (config.public.deploymentEnvironment !== 'production') {
    setHeader(event, 'x-robots-tag', 'noindex, nofollow, noarchive');
  }
});
