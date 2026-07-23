export const PRODUCTION_SITE_URL = 'https://film-together.com';
export const DEFAULT_OG_IMAGE_PATH = '/images/og/film-together.png';

export const INDEXABLE_ROUTES = [
  '/',
  '/for-couples',
  '/for-friends',
  '/for-groups',
  '/cooperation',
  '/legal/privacy',
  '/legal/cookies',
  '/legal/terms',
] as const;

export const normalizeSiteUrl = (value: string) => value.replace(/\/$/, '');

export const normalizeSeoPath = (value: string) => {
  if (!value || value === '/') return '/';
  const normalized = value.startsWith('/') ? value : `/${value}`;
  return normalized.replace(/\/$/, '');
};

export const buildAbsoluteUrl = (origin: string, path: string) => {
  const normalizedPath = normalizeSeoPath(path);
  return `${normalizeSiteUrl(origin)}${normalizedPath === '/' ? '/' : normalizedPath}`;
};

export const isIndexablePath = (path: string) =>
  (INDEXABLE_ROUTES as readonly string[]).includes(normalizeSeoPath(path));

export const isHtmlRoutePath = (path: string) => {
  const normalized = normalizeSeoPath(path);
  const lastSegment = normalized.split('/').at(-1) ?? '';
  return !lastSegment.includes('.');
};
