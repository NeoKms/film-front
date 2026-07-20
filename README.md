Source available. Not open source

# film-front

Nuxt frontend для совместного выбора фильмов. Пользователь может работать гостем: создать комнату, пригласить участников по коду или ссылке, настроить фильтры, независимо выбирать фильмы и получить общие совпадения.

Публичный landing объясняет продукт и ведёт прямо в guest flow. Зарегистрированным пользователям доступен личный кабинет с историей комнат; структура кабинета подготовлена под просмотренное, чёрный список и настройки безопасности.

## Стек

- Nuxt 4, Vue 3, TypeScript;
- Pinia;
- Tailwind CSS 4;
- Socket.IO client;
- vee-validate + Zod для форм.

## Локальный запуск

```sh
npm install
cp .env.example .env
npm run dev
```

Для полного room flow нужны доступные HTTP API и Socket.IO gateway. Их origins задаются в `.env`.

## Environment

| Переменная                 | Назначение                                                           |
| -------------------------- | -------------------------------------------------------------------- |
| `API_URL`                  | HTTP API origin без завершающего `/`                                 |
| `SOCKET_URL`               | Socket.IO origin; gateway работает на отдельном порту                |
| `GOOGLE_CLIENT_ID`         | Google OAuth client id; не нужен для guest flow                      |
| `COOKIE_ACCESS_TOKEN_EXP`  | Время жизни access cookie в секундах                                 |
| `COOKIE_REFRESH_TOKEN_EXP` | Время жизни refresh cookie в секундах                                |
| `DEBUG`                    | `1` добавляет искусственную задержку API для проверки loading states |
| `SITE_URL`                 | Публичный origin для canonical URL, robots и sitemap                 |
| `LEGAL_EMAIL`              | Контакт оператора на странице политики обработки данных              |

## Команды

```sh
npm run dev
npm run build
npm run typecheck
npm run lint:check
npm test
npm run generate
npm run preview
# после npm run build
npm run test:seo
```
