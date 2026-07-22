// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite';
import { filmGroupIcons } from './utils/film-groups';

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  css: ['~/assets/css/tailwind.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  modules: [
    '@pinia/nuxt',
    '@vee-validate/nuxt',
    // '@nuxtjs/i18n',
    '@nuxt/image',
    '@vueuse/nuxt',
    '@nuxt/icon',
    '@nuxt/eslint',
  ],

  icon: {
    clientBundle: {
      scan: true,
      icons: filmGroupIcons.map((name) => `lucide:${name}`),
    },
  },

  routeRules: {
    '/**': {
      headers: {
        'content-security-policy':
          "default-src 'self'; script-src 'self' 'unsafe-inline' https://mc.yandex.ru; connect-src 'self' https://mc.yandex.ru https://*.mc.yandex.ru https://*.jrgreez.ru wss://*.jrgreez.ru https://film-together.com https://*.film-together.com wss://*.film-together.com http://localhost:* ws://localhost:*; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src https://www.youtube-nocookie.com https://www.youtube.com; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
        'referrer-policy': 'strict-origin-when-cross-origin',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'permissions-policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
  },

  runtimeConfig: {
    public: {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      API_URL: process.env.API_URL,
      SOCKET_URL: process.env.SOCKET_URL || 'http://localhost:8100',
      cookie: {
        ate: process.env.COOKIE_ACCESS_TOKEN_EXP,
        rte: process.env.COOKIE_REFRESH_TOKEN_EXP,
      },
      debug: process.env.DEBUG === '1',
      siteUrl: process.env.SITE_URL || 'http://localhost:3000',
      legalEmail: process.env.LEGAL_EMAIL || '',
      yandexMetrikaId:
        process.env.YANDEX_METRIKA_ID ||
        (process.env.DEPLOYMENT_ENVIRONMENT === 'production'
          ? '110851622'
          : ''),
      analyticsEnvironment: process.env.ANALYTICS_ENVIRONMENT || 'local',
      deploymentEnvironment: process.env.DEPLOYMENT_ENVIRONMENT || 'local',
    },
  },

  devServer: {
    port: 3000,
  },
});
