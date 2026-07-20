import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

const productionOrigin = 'https://film-together.com';
const publicRoutes = [
  '/',
  '/for-couples',
  '/for-friends',
  '/for-groups',
  '/legal/privacy',
  '/legal/cookies',
  '/legal/terms',
];
const privateRoutes = [
  '/sign-in',
  '/signup',
  '/profile',
  '/admin',
  '/oauth2',
  '/room/join',
  '/room/000000000000000000000000',
  '/film/000000000000000000000000',
  '/share/000000000000000000000000',
];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const waitUntilReady = async (origin, child) => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Nuxt server exited with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(`${origin}/robots.txt`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await delay(100);
  }
  throw new Error(`Nuxt server did not start at ${origin}`);
};

const startServer = async ({ environment, port }) => {
  const child = spawn('node', ['.output/server/index.mjs'], {
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      NUXT_PUBLIC_DEPLOYMENT_ENVIRONMENT: environment,
      NUXT_PUBLIC_SITE_URL:
        environment === 'production'
          ? productionOrigin
          : `http://127.0.0.1:${port}`,
      NUXT_PUBLIC_API_URL: 'http://127.0.0.1:1',
      NUXT_PUBLIC_SOCKET_URL: 'http://127.0.0.1:1',
      NUXT_PUBLIC_YANDEX_METRIKA_ID: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  const origin = `http://127.0.0.1:${port}`;
  try {
    await waitUntilReady(origin, child);
  } catch (error) {
    child.kill('SIGTERM');
    throw new Error(`${error.message}\n${output}`, { cause: error });
  }
  return { child, origin };
};

const stopServer = async (child) => {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), delay(2000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
};

const read = (origin, path, options = {}) =>
  fetch(`${origin}${path}`, {
    redirect: options.redirect ?? 'follow',
    signal: AbortSignal.timeout(5000),
  });

const canonicalFor = (path) =>
  `${productionOrigin}${path === '/' ? '/' : path}`;

const checkPublicRoutes = async (origin) => {
  for (const path of publicRoutes) {
    const response = await read(origin, path);
    const html = await response.text();
    const canonical = canonicalFor(path);
    assert(response.status === 200, `${path} must return 200`);
    assert(
      !response.headers.has('x-robots-tag'),
      `${path} must not return X-Robots-Tag in production`,
    );
    assert(
      new RegExp(
        `<link[^>]+rel=["']canonical["'][^>]+href=["']${escapeRegExp(canonical)}["']`,
      ).test(html),
      `${path} must contain canonical ${canonical}`,
    );
    assert(
      /<meta[^>]+name=["']robots["'][^>]+content=["']index, follow["']/.test(
        html,
      ),
      `${path} must be indexable`,
    );
    assert(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']https:\/\//.test(
        html,
      ),
      `${path} must contain an absolute og:image`,
    );
    assert(
      (html.match(/<h1\b/g) ?? []).length === 1,
      `${path} must contain exactly one h1`,
    );
    if (!path.startsWith('/legal/')) {
      const jsonLd = html.match(
        /<script[^>]+type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/s,
      );
      assert(jsonLd, `${path} must contain JSON-LD`);
      JSON.parse(jsonLd[1]);
    }
  }
};

const checkPrivateRoutes = async (origin) => {
  for (const path of privateRoutes) {
    const response = await read(origin, path, { redirect: 'manual' });
    assert(
      response.headers.get('x-robots-tag') === 'noindex, nofollow, noarchive',
      `${path} must return a noindex X-Robots-Tag`,
    );
  }
};

const checkProductionFiles = async (origin) => {
  const robotsResponse = await read(origin, '/robots.txt');
  const robots = await robotsResponse.text();
  assert(
    robotsResponse.status === 200,
    'production robots.txt must return 200',
  );
  assert(robots.includes('Allow: /'), 'production robots.txt must allow crawl');
  assert(
    !robots.includes('Disallow:'),
    'production robots.txt must not hide noindex routes from crawlers',
  );
  assert(
    robots.includes(`Sitemap: ${productionOrigin}/sitemap.xml`),
    'production robots.txt must reference the canonical sitemap',
  );

  const sitemapResponse = await read(origin, '/sitemap.xml');
  const sitemap = await sitemapResponse.text();
  assert(sitemapResponse.status === 200, 'production sitemap must return 200');
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
    ([, location]) => location,
  );
  assert(
    JSON.stringify(locations) ===
      JSON.stringify(publicRoutes.map(canonicalFor)),
    'sitemap routes must match the public allowlist',
  );
};

const checkNonProduction = async (origin) => {
  const homeResponse = await read(origin, '/');
  assert(
    homeResponse.headers.get('x-robots-tag') === 'noindex, nofollow, noarchive',
    'non-production must return global X-Robots-Tag',
  );
  const robotsResponse = await read(origin, '/robots.txt');
  const robots = await robotsResponse.text();
  assert(robots.includes('Disallow: /'), 'non-production robots must deny all');
  const sitemapResponse = await read(origin, '/sitemap.xml');
  assert(
    sitemapResponse.status === 404,
    'non-production sitemap must return 404',
  );
};

assert(
  await import('node:fs').then(({ existsSync }) =>
    existsSync('.output/server/index.mjs'),
  ),
  'Build is missing. Run npm run build before npm run test:seo.',
);

let server;
try {
  server = await startServer({ environment: 'production', port: 3199 });
  await checkPublicRoutes(server.origin);
  await checkPrivateRoutes(server.origin);
  await checkProductionFiles(server.origin);
} finally {
  if (server) await stopServer(server.child);
}

server = undefined;
try {
  server = await startServer({ environment: 'dev', port: 3200 });
  await checkNonProduction(server.origin);
} finally {
  if (server) await stopServer(server.child);
}

console.log('SEO SSR checks passed');
