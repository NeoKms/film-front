import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';

const chromiumTouch = {
  ...devices['Desktop Chrome'],
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
};

export default defineConfig({
  testDir: './e2e',
  testMatch: 'mobile-responsive.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          API_URL: 'http://localhost:8000',
          SOCKET_URL: 'http://localhost:8100',
          SITE_URL: baseURL,
          YANDEX_METRIKA_ID: '',
          ANALYTICS_ENVIRONMENT: 'test',
          DEPLOYMENT_ENVIRONMENT: 'test',
        },
      },
  projects: [
    {
      name: 'minimum-320x568',
      use: { ...chromiumTouch, viewport: { width: 320, height: 568 } },
    },
    {
      name: 'galaxy-s24-360x780',
      use: { ...devices['Galaxy S24'] },
    },
    {
      name: 'iphone-se3-375x667',
      use: { ...devices['iPhone SE (3rd gen)'], browserName: 'webkit' },
    },
    {
      name: 'production-390x844',
      use: { ...chromiumTouch, viewport: { width: 390, height: 844 } },
    },
    {
      name: 'iphone-13-390x664',
      use: { ...devices['iPhone 13'], browserName: 'webkit' },
    },
    {
      name: 'generic-android-393x873',
      use: { ...chromiumTouch, viewport: { width: 393, height: 873 } },
    },
    {
      name: 'iphone-16-pro-max-440x763',
      use: { ...devices['iPhone 16 Pro Max'], browserName: 'webkit' },
    },
    {
      name: 'pixel-9-pro-xl-448x921',
      use: { ...devices['Pixel 9 Pro XL'] },
    },
    {
      name: 'galaxy-z-fold6-inner-928x1004',
      use: { ...devices['Galaxy Z Fold 6'] },
    },
  ],
});
