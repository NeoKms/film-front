import {
  expect,
  test,
  type Locator,
  type Page,
  type Route,
} from '@playwright/test';

const appUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const routes = [
  '/',
  '/for-couples',
  '/for-friends',
  '/for-groups',
  '/sign-in',
  '/signup',
  '/legal/privacy',
  '/legal/cookies',
  '/legal/terms',
  '/error/500',
  '/responsive-route-that-does-not-exist',
];

const roomId = 'responsive-room';
const owner = { _id: 'responsive-guest', name: 'Гость' };
const baseRoom = {
  _id: roomId,
  created_at: '2026-07-22T12:00:00.000Z',
  film_filter: {
    order: 'random',
    groups: [],
    tags: [],
    exclude_tags: [],
    countries: [],
    exclude_countries: [],
    actors: [],
    exclude_actors: [],
    age_ratings: [],
    mpaa_ratings: [],
  },
  code: '657170',
  status: 0,
  participants: [owner],
  created_by: owner,
};
const films = [
  {
    _id: 'responsive-film-1',
    name: 'Первый фильм для responsive-проверки',
    description: 'Проверяем карточку, controls и viewport-fit layout.',
    rating: 8.1,
    duration: 112,
    rating_age: 12,
    rating_mpaa: 'PG13',
    year: 2024,
    poster_url: null,
    cover_url: null,
    trailer_url: null,
    country_names: ['Россия'],
    tag_names: ['Драма'],
    person_items: [],
  },
  {
    _id: 'responsive-film-2',
    name: 'Второй фильм',
    description: 'Следующая карточка.',
    rating: 7.4,
    duration: 98,
    rating_age: 6,
    rating_mpaa: 'PG',
    year: 2023,
    poster_url: null,
    cover_url: null,
    trailer_url: null,
    country_names: ['США'],
    tag_names: ['Комедия'],
    person_items: [],
  },
];

const assertNoHorizontalOverflow = async (page: Page) => {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));

  expect(dimensions.documentWidth).toBeLessThanOrEqual(
    dimensions.viewportWidth + 1,
  );
  expect(dimensions.bodyWidth).toBeLessThanOrEqual(
    dimensions.viewportWidth + 1,
  );
};

const assertInsideViewport = async (locator: Locator, page: Page) => {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
};

const assertTouchTarget = async (locator: Locator) => {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(40);
  expect(box!.height).toBeGreaterThanOrEqual(40);
};

const fulfillJson = async (route: Route, json: unknown, status = 200) => {
  const request = route.request();
  const headers = {
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type,x-guest-id',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-origin': request.headers().origin || '*',
  };

  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers });
    return;
  }

  await route.fulfill({
    status,
    headers,
    contentType: 'application/json',
    json,
  });
};

const mockRoomApi = async (page: Page) => {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (request.resourceType() === 'document') {
      await route.continue();
      return;
    }

    if (path === '/auth/guest') {
      await fulfillJson(route, { ...owner, roles: ['guest'] });
      return;
    }
    if (path === '/consent') {
      await fulfillJson(route, { recorded: true });
      return;
    }
    if (path === '/room' && request.method() === 'POST') {
      await fulfillJson(route, baseRoom);
      return;
    }
    if (path === `/room/${roomId}/start`) {
      await fulfillJson(route, { ...baseRoom, status: 1 });
      return;
    }
    if (path === `/room/${roomId}/films/matched`) {
      await fulfillJson(route, []);
      return;
    }
    if (path === `/room/${roomId}/films`) {
      await fulfillJson(route, films);
      return;
    }
    if (path.startsWith(`/room/${roomId}/films/`)) {
      await fulfillJson(route, { recorded: true });
      return;
    }
    if (path === `/room/${roomId}`) {
      await fulfillJson(route, baseRoom);
      return;
    }
    if (path === '/film/fast-filter-total') {
      const body = request.postDataJSON() as Record<string, unknown>;
      const key = Object.keys(body)[0] ?? '0';
      await fulfillJson(route, { [key]: 2176 });
      return;
    }
    if (path === '/film-groups') {
      await fulfillJson(route, {
        items: [],
        meta: { total: 0, limit: 100, offset: 0 },
      });
      return;
    }
    if (path === '/tag' || path === '/country' || path === '/person') {
      await fulfillJson(route, {
        items: [],
        meta: { total: 0, limit: 20, offset: 0 },
      });
      return;
    }

    await route.continue();
  });
};

test.describe('extended mobile responsive matrix', () => {
  test('public, auth, legal and error routes do not overflow', async ({
    page,
  }) => {
    await page.context().addCookies([
      {
        name: 'cookie-notice-acknowledged',
        value: 'true',
        url: appUrl,
      },
    ]);

    for (const route of routes) {
      await page.goto(route, { waitUntil: 'networkidle' });
      await expect(page.locator('body')).toBeVisible();
      await assertNoHorizontalOverflow(page);
    }
  });

  test('cookie, navigation and dialog controls stay reachable', async ({
    page,
  }) => {
    await mockRoomApi(page);
    await page.goto('/', { waitUntil: 'networkidle' });

    const cookieNotice = page.getByLabel('Уведомление об использовании cookie');
    await assertInsideViewport(cookieNotice, page);
    const usesCompactMobileNavigation = page.viewportSize()!.width < 640;
    const cookieChoice = cookieNotice.getByRole('button', {
      name: 'Только необходимые',
    });
    if (usesCompactMobileNavigation) await assertTouchTarget(cookieChoice);
    else await expect(cookieChoice).toBeVisible();

    const navigationTargets = [
      page.getByRole('link', { name: 'Film Together — на главную' }),
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
    for (const target of navigationTargets) {
      if (usesCompactMobileNavigation) await assertTouchTarget(target);
      else await expect(target).toBeVisible();
    }

    await cookieChoice.click();
    await page.getByRole('button', { name: 'Как это работает' }).click();

    const dialog = page.getByRole('dialog', { name: 'Три шага до фильма' });
    await assertInsideViewport(dialog, page);
    await assertTouchTarget(dialog.getByRole('button', { name: 'Закрыть' }));
    await assertNoHorizontalOverflow(page);
  });

  test('room settings and swipe controls fit the viewport', async ({
    page,
  }) => {
    await mockRoomApi(page);
    await page.context().addCookies([
      {
        name: 'cookie-notice-acknowledged',
        value: 'true',
        url: appUrl,
      },
    ]);
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Создать комнату' }).first().click();
    await expect(page).toHaveURL(`/room/${roomId}`);

    const header = page.locator('header').first();
    const invitation = page.getByText('Код приглашения').locator('..');
    const headerBox = await header.boundingBox();
    const invitationBox = await invitation.boundingBox();
    expect(invitationBox!.y).toBeGreaterThanOrEqual(
      headerBox!.y + headerBox!.height - 1,
    );
    await assertNoHorizontalOverflow(page);

    await page
      .getByRole('button', { name: 'Изменить настройки выборки' })
      .click();
    const settings = page.getByRole('dialog', { name: 'Настройки комнаты' });
    await assertInsideViewport(settings, page);
    await assertTouchTarget(settings.getByRole('button', { name: 'Закрыть' }));
    await expect(
      settings.getByRole('button', { name: 'Сохранить фильтры' }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await settings.getByRole('button', { name: 'Закрыть' }).click();

    await page.getByRole('button', { name: /Начать выбор/ }).click();
    await expect(page.getByText(films[0]!.name)).toBeVisible();

    const roomPanel = page.getByText('Комната', { exact: true }).locator('..');
    const roomPanelBox = await roomPanel.boundingBox();
    const startedHeaderBox = await header.boundingBox();
    expect(roomPanelBox!.y).toBeGreaterThanOrEqual(
      startedHeaderBox!.y + startedHeaderBox!.height - 1,
    );

    const reject = page.getByRole('button', { name: 'Пропустить фильм' });
    const undo = page.getByRole('button', { name: 'Отменить последний выбор' });
    const select = page.getByRole('button', { name: 'Выбрать фильм' });
    await assertTouchTarget(reject);
    await assertTouchTarget(undo);
    await assertTouchTarget(select);

    await select.click();
    await expect(page.getByText(films[1]!.name)).toBeVisible();
    await undo.click();
    await expect(page.getByText(films[0]!.name)).toBeVisible();
    await reject.click();
    await expect(page.getByText(films[1]!.name)).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
