<script setup lang="ts">
const acknowledged = useCookie<boolean | null>('cookie-notice-acknowledged', {
  default: () => null,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
});
const { consent, setConsent } = useProductAnalytics();
const wrappedFetch = useWrappedFetch();
const saving = ref(false);
const saved = ref(false);

const choiceLabel = computed(() => {
  if (consent.value === true) return 'Аналитика разрешена';
  if (consent.value === false) return 'Только необходимые cookie';
  return 'Выбор ещё не сделан';
});

const saveChoice = async (allowAnalytics: boolean) => {
  if (saving.value) return;
  saving.value = true;
  saved.value = false;
  setConsent(allowAnalytics);
  acknowledged.value = true;
  try {
    await wrappedFetch('/consent', {
      method: 'POST',
      body: {
        purpose: 'analytics',
        version: '2026-07-19',
        granted: allowAnalytics,
      },
    });
    saved.value = true;
  } catch {
    // The local choice remains effective even if the audit API is unavailable.
  } finally {
    saving.value = false;
  }
};

usePublicSeo({
  path: '/legal/cookies',
  title: 'Политика использования cookie',
  description: 'Какие cookie использует сервис Film Together.',
  ogTitle: 'Cookie и аналитика — Film Together',
  ogDescription:
    'Необходимые cookie сервиса, consent-gated Яндекс Метрика и управление выбором аналитики.',
});
</script>

<template>
  <main class="mx-auto w-full max-w-4xl px-5 py-12 sm:py-16">
    <p class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
      Правовая информация
    </p>
    <h1 class="mt-3 text-3xl font-semibold text-white sm:text-5xl">
      Политика использования cookie
    </h1>
    <p class="mt-4 text-sm text-zinc-500">Редакция от 19 июля 2026 года</p>

    <div class="legal-copy mt-10">
      <section>
        <h2>1. Общие положения</h2>
        <p>
          Film Together использует файлы cookie и аналогичные технологии, чтобы
          авторизовать пользователей, поддерживать гостевые сессии, сохранять
          выбранную комнату и, только после отдельного согласия, получать
          статистику посещений с помощью Яндекс Метрики.
        </p>
        <p>
          Cookie — небольшой фрагмент данных, который сайт сохраняет в браузере.
          Некоторые записи localStorage Яндекс Метрики выполняют аналогичную
          функцию и рассматриваются в настоящей Политике вместе с cookie.
        </p>
      </section>

      <section>
        <h2>2. Необходимые cookie Film Together</h2>
        <p>
          Эти cookie нужны для работы запрошенных функций и устанавливаются без
          подключения Яндекс Метрики.
        </p>
        <div class="mt-4 grid gap-3">
          <article
            class="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
          >
            <h3 class="font-mono text-sm text-amber-200">accessToken</h3>
            <p class="mt-2">
              Подтверждает авторизованную сессию. Хранится не дольше срока
              действия access-токена, установленного конфигурацией сервиса.
            </p>
          </article>
          <article
            class="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
          >
            <h3 class="font-mono text-sm text-amber-200">refreshToken</h3>
            <p class="mt-2">
              Позволяет безопасно продлить авторизованную сессию. Хранится до
              истечения refresh-токена, выхода пользователя или завершения
              сессии.
            </p>
          </article>
          <article
            class="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
          >
            <h3 class="font-mono text-sm text-amber-200">guest</h3>
            <p class="mt-2">
              Идентифицирует гостевую сессию для участия в комнатах. Срок — 30
              дней после последней активности.
            </p>
          </article>
          <article
            class="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
          >
            <h3 class="font-mono text-sm text-amber-200">last-room-id</h3>
            <p class="mt-2">
              Позволяет вернуться в последнюю активную комнату. Срок — 30 дней.
            </p>
          </article>
          <article
            class="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
          >
            <h3 class="font-mono text-sm text-amber-200">
              cookie-notice-acknowledged
            </h3>
            <p class="mt-2">
              Сохраняет факт выбора настроек cookie, чтобы не показывать
              уведомление при каждом открытии страницы. Срок — 1 год.
            </p>
          </article>
          <article
            class="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
          >
            <h3 class="font-mono text-sm text-amber-200">analytics-consent</h3>
            <p class="mt-2">
              Хранит выбор «разрешить» или «отказаться» от аналитики. Срок — 1
              год. Сам по себе этот cookie не включает счётчик без
              положительного значения.
            </p>
          </article>
          <article
            class="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
          >
            <h3 class="font-mono text-sm text-amber-200">
              google-privacy-consent
            </h3>
            <p class="mt-2">
              Кратковременно подтверждает отдельное согласие при возврате из
              Google OAuth, чтобы записать его для созданного или найденного
              аккаунта. Срок — не более 10 минут; удаляется после завершения
              авторизации.
            </p>
          </article>
        </div>
      </section>

      <section>
        <h2>3. Аналитические технологии Яндекс Метрики</h2>
        <p>
          После согласия браузер загружает счётчик Яндекс Метрики. ООО «ЯНДЕКС»
          может устанавливать, в зависимости от конфигурации и браузера, cookie
          <code>_ym_uid</code>, <code>_ym_d</code>, <code>_ym_isad</code>,
          <code>yandexuid</code>, <code>yuidss</code>, <code>ymex</code> и иные
          технические идентификаторы, а также записи localStorage.
        </p>
        <p>
          Например, <code>_ym_uid</code>, <code>yandexuid</code> и
          <code>ymex</code> обычно хранятся 1 год, <code>_ym_isad</code> — 20
          часов, отдельные технические cookie — в течение сессии или до 2 лет.
          Полный актуальный перечень, назначение и сроки опубликованы в
          <a
            href="https://yandex.ru/support/metrica/ru/general/cookie-usage"
            target="_blank"
            rel="noopener noreferrer"
            >документации Яндекс Метрики</a
          >.
        </p>
        <p>
          Счётчик получает IP-адрес, технические идентификаторы, сведения об
          устройстве, браузере, операционной системе, языке, часовом поясе и
          экране, источник перехода, адреса страниц, время и продолжительность
          посещения, переходы по ссылкам и продуктовые события. Вебвизор и
          запись действий пользователя на экране в Film Together не
          используются.
        </p>
      </section>

      <section>
        <h2>4. Управление выбором</h2>
        <p>
          Отказ от аналитики не ограничивает создание и использование комнат.
          При отзыве согласия Film Together прекращает последующий сбор,
          деинициализирует счётчик в текущей вкладке и удаляет доступные сайту
          аналитические cookie первого уровня. Ранее переданные данные
          обрабатываются в соответствии с условиями Яндекс Метрики и применимым
          законодательством.
        </p>
        <div
          class="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5"
        >
          <div
            class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-wide text-zinc-500"
              >
                Текущий выбор
              </p>
              <p class="mt-1 font-medium text-white">{{ choiceLabel }}</p>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                class="min-h-11 rounded-xl bg-amber-300 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200 disabled:opacity-50"
                :class="{ 'ring-2 ring-amber-100': consent === true }"
                :disabled="saving"
                :aria-pressed="consent === true"
                @click="saveChoice(true)"
              >
                Разрешить аналитику
              </button>
              <button
                type="button"
                class="min-h-11 rounded-xl border border-white/15 px-5 text-sm font-medium text-zinc-200 transition hover:bg-white/5 disabled:opacity-50"
                :class="{
                  'border-amber-300/50 text-amber-200': consent === false,
                }"
                :disabled="saving"
                :aria-pressed="consent === false"
                @click="saveChoice(false)"
              >
                Только необходимые
              </button>
            </div>
          </div>
          <p
            v-if="saved"
            class="mt-3 text-sm text-emerald-300"
            aria-live="polite"
          >
            Настройки сохранены.
          </p>
        </div>
        <p>
          Cookie также можно удалить или заблокировать средствами браузера.
          После удаления необходимых cookie может потребоваться повторный вход,
          а гостевая идентичность и быстрый возврат в комнату могут быть
          потеряны. Дополнительно пользователь может применять расширение
          «Блокировщик Яндекс Метрики», упомянутое в
          <a
            href="https://yandex.ru/legal/metrica_termsofuse/ru/"
            target="_blank"
            rel="noopener noreferrer"
            >условиях сервиса Яндекс Метрика</a
          >.
        </p>
      </section>
    </div>
  </main>
</template>
