import { expect, test, type Page, type Route } from '@playwright/test';

const publicRoutes = [
  '/',
  '/for-couples',
  '/for-friends',
  '/for-groups',
  '/sign-in',
  '/signup',
  '/legal/privacy',
  '/legal/cookies',
  '/legal/terms',
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

  test('unknown and missing share routes use the branded 404', async ({
    page,
  }) => {
    await page.goto('/route-that-does-not-exist');

    await expect(
      page.getByRole('heading', { name: 'Страница не найдена' }),
    ).toBeVisible();
    await expect(page.getByText('Ошибка 404')).toBeVisible();
    await expect(page).toHaveTitle('Страница не найдена · Film Together');
    await expect(page.locator('body')).toHaveCSS(
      'background-color',
      'rgb(11, 13, 18)',
    );

    await page.getByRole('link', { name: 'На главную', exact: true }).click();
    await expect(page).toHaveURL('/');

    await page.route('**/film?**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: { items: [] },
      }),
    );
    await page.goto('/share/000000000000000000000000');

    await expect(
      page.getByRole('heading', { name: 'Страница не найдена' }),
    ).toBeVisible();
    await expect(page.getByText('Ошибка 404')).toBeVisible();
  });

  test('mobile navigation targets are at least 40 pixels high', async ({
    page,
  }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile-'));
    await page.goto('/', { waitUntil: 'networkidle' });

    const targets = [
      page.getByRole('link', {
        name: 'Film Together — на главную',
        exact: true,
      }),
      page.getByRole('button', { name: 'Сообщить об ошибке' }),
      page.getByRole('link', { name: 'Аккаунт', exact: true }),
      page.getByRole('link', { name: 'Для двоих', exact: true }),
      page.getByRole('link', { name: 'С друзьями', exact: true }),
      page.getByRole('link', { name: 'Для компании', exact: true }),
      page.getByRole('link', { name: 'Обработка данных', exact: true }),
      page.getByRole('link', { name: 'Файлы cookie', exact: true }),
      page.getByRole('link', {
        name: 'Пользовательское соглашение',
        exact: true,
      }),
    ];

    for (const target of targets) {
      const box = await target.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(40);
    }
  });
});
