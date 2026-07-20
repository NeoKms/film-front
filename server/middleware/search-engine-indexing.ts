import { isHtmlRoutePath, isIndexablePath } from '../../utils/seo';

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const path = getRequestURL(event).pathname;
  const isProduction = config.public.deploymentEnvironment === 'production';

  if (!isProduction || (isHtmlRoutePath(path) && !isIndexablePath(path))) {
    setHeader(event, 'x-robots-tag', 'noindex, nofollow, noarchive');
  }
});
