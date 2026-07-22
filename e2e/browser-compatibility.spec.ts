import { expect, test, type Page, type Route } from '@playwright/test';

const publicRoutes = [
  '/',
  '/for-couples',
  '/for-friends',
  '/for-groups',
  '/sign-in',
];

const collectRuntimeErrors = (page: Page) => {
  const errors: string[] = [];

  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  return errors;
};

const mockGuestApi = async (page: Page) => {
  const fulfillApiRequest = async (
    route: Route,
    json: Record<string, unknown>,
  ) => {
    const request = route.request();
    const corsHeaders = {
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'content-type,x-guest-id',
      'access-control-allow-methods': 'POST,OPTIONS',
      'access-control-allow-origin': request.headers().origin || '*',
    };

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      json,
    });
  };

  await page.route('**/auth/guest', (route) =>
    fulfillApiRequest(route, {
      _id: 'e2e-guest',
      name: 'Гость',
      roles: ['guest'],
    }),
  );
  await page.route('**/consent', (route) =>
    fulfillApiRequest(route, { recorded: true }),
  );
};

test.describe('cross-browser public smoke', () => {
  for (const route of publicRoutes) {
    test(`${route} renders without overflow or runtime errors`, async ({
      page,
    }) => {
      const runtimeErrors = collectRuntimeErrors(page);
      const response = await page.goto(route, { waitUntil: 'networkidle' });

      expect(response?.ok()).toBe(true);
      await expect(page.locator('body')).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.documentWidth).toBeLessThanOrEqual(
        dimensions.viewportWidth + 1,
      );
      expect(runtimeErrors).toEqual([]);
    });
  }

  test('landing interactions work with keyboard and pointer input', async ({
    page,
  }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await mockGuestApi(page);
    await page.goto('/', { waitUntil: 'networkidle' });

    const cookieNotice = page.getByLabel('Уведомление об использовании cookie');
    await expect(cookieNotice).toBeVisible();
    await cookieNotice
      .getByRole('button', { name: 'Только необходимые' })
      .click();
    await expect(cookieNotice).toBeHidden();

    const howItWorks = page.getByRole('button', { name: 'Как это работает' });
    await howItWorks.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Три шага до фильма' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Закрыть' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(howItWorks).toBeFocused();

    const matchedStep = page.getByRole('button', { name: 'Совпало' });
    await matchedStep.click();
    await expect(matchedStep).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Есть совпадение')).toBeVisible();

    await page.getByLabel('Код комнаты').fill('12ab34');
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect(page.getByText('Введите шестизначный код')).toBeVisible();

    expect(runtimeErrors).toEqual([]);
  });

  test('500 retry reconnects and returns to the landing', async ({ page }) => {
    await mockGuestApi(page);
    await page.goto('/error/500', { waitUntil: 'networkidle' });

    await page.getByRole('button', { name: 'Попробовать снова' }).click();

    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', {
        name: 'Выберите фильм вместе без споров.',
      }),
    ).toBeVisible();
  });
});
