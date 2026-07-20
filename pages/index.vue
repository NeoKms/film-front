<script setup lang="ts">
const config = useRuntimeConfig();
const faqItems = [
  {
    question: 'Как выбрать фильм вместе онлайн?',
    answer:
      'Создайте комнату, пригласите участников по ссылке, QR-коду или шестизначному коду. Каждый оценивает фильмы независимо, а сервис показывает общие совпадения.',
  },
  {
    question: 'Нужно устанавливать приложение?',
    answer:
      'Нет. Film Together работает прямо в браузере на телефоне и компьютере.',
  },
  {
    question: 'Нужна регистрация?',
    answer:
      'Нет. Для комнаты достаточно гостевого имени. Аккаунт нужен для личной истории и будущих списков предпочтений.',
  },
  {
    question: 'Что считается совпадением?',
    answer:
      'Фильм становится совпадением, когда его положительно выбрали все текущие участники комнаты.',
  },
  {
    question: 'Сколько человек может участвовать?',
    answer:
      'До 12 участников в одной комнате: подходит паре, друзьям и небольшой компании.',
  },
  {
    question: 'Видят ли другие мои ответы?',
    answer:
      'Нет. Отдельные решения участников не показываются. Все видят только общий match.',
  },
  {
    question: 'Можно ли изменить фильтры после старта?',
    answer:
      'Фильтры фиксируются при старте, чтобы очередь была одинаковой для всех. Их можно изменить до начала или повторить завершённую комнату.',
  },
  {
    question: 'Что происходит после итогового выбора?',
    answer:
      'Организатор выбирает один из matches, комната завершается, а результатом можно поделиться.',
  },
  {
    question: 'Film Together бесплатный?',
    answer:
      'Да, beta-версия бесплатна и работает без обязательной регистрации.',
  },
  {
    question: 'Здесь есть сериалы?',
    answer:
      'Нет. Film Together сейчас помогает выбирать полнометражные фильмы.',
  },
];
usePublicSeo({
  path: '/',
  title: 'Выбрать фильм вместе онлайн',
  description:
    'Бесплатно выберите фильм на вечер вдвоём или с друзьями: создайте комнату, настройте фильтры и свайпайте независимо до общего совпадения.',
  ogTitle: 'Film Together — выберите фильм вместе без споров',
  ogDescription:
    'Комната по ссылке, точные фильтры и независимый выбор фильмов. Без установки и обязательной регистрации.',
  structuredData: ({ canonicalUrl, imageUrl }) => ({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${canonicalUrl}#website`,
        name: 'Film Together',
        url: canonicalUrl,
        inLanguage: 'ru-RU',
      },
      {
        '@type': 'WebApplication',
        '@id': `${canonicalUrl}#application`,
        name: 'Film Together',
        applicationCategory: 'EntertainmentApplication',
        operatingSystem: 'Любая система с современным браузером',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
        description:
          'Сервис для совместного выбора фильма вдвоём или с друзьями.',
        url: canonicalUrl,
        image: imageUrl,
        inLanguage: 'ru-RU',
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: buildFaqEntities(faqItems),
      },
    ],
  }),
});

const roomStore = useRoomStore();
const notificationStore = useNotificationStore();
const { trackCreate, trackDemo, trackFaq } = useLandingAnalytics('home');
const code = ref('');
const loading = ref(false);
const showHowItWorks = ref(false);
const mechanicSteps = [
  {
    label: 'Комната',
    title: 'Все в сборе',
    text: 'Участники появляются в комнате в реальном времени.',
  },
  {
    label: 'Свайп',
    title: 'Выбор независимо',
    text: 'Каждый видит карточки и голосует в своём темпе.',
  },
  {
    label: 'Match',
    title: 'Совпадение найдено',
    text: 'Общий положительный выбор сразу получают все.',
  },
  {
    label: 'Итог',
    title: 'Фильм выбран',
    text: 'Результат фиксируется — возвращаться к спору не нужно.',
  },
];
const activeMechanicStep = ref(0);
const selectMechanicStep = (index: number) => {
  activeMechanicStep.value = index;
  trackDemo();
};
let mechanicTimer: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  mechanicTimer = setInterval(() => {
    activeMechanicStep.value =
      (activeMechanicStep.value + 1) % mechanicSteps.length;
  }, 2600);
});
onBeforeUnmount(() => {
  if (mechanicTimer) clearInterval(mechanicTimer);
});
const { data: lastRoom } = await useAsyncData('last-active-room', () =>
  roomStore.openLastRoom(),
);
const { track } = useProductAnalytics();

const createRoom = async (source: 'hero' | 'result' | 'final') => {
  trackCreate(source);
  loading.value = true;
  try {
    const room = await roomStore.createRoom();
    await navigateTo(`/room/${room._id}`);
  } finally {
    loading.value = false;
  }
};

const joinRoom = async () => {
  track('join_submit');
  const normalizedCode = code.value.trim().toUpperCase();
  if (normalizedCode.length !== 6) {
    notificationStore.addNotification('Введите шестизначный код', 'warning');
    return;
  }
  loading.value = true;
  try {
    const room = await roomStore.joinByCode(normalizedCode);
    track('join_success');
    await navigateTo(`/room/${room._id}`);
  } finally {
    loading.value = false;
  }
};

const onFaqToggle = (event: Event, index: number) => {
  if ((event.currentTarget as HTMLDetailsElement).open) trackFaq(index);
};
</script>

<template>
  <div>
    <section
      class="relative isolate flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden px-5 py-12"
    >
      <div class="pointer-events-none absolute inset-0 cinematic-grid" />
      <div
        class="relative mx-auto grid min-w-0 w-full max-w-6xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center"
      >
        <div class="min-w-0 max-w-2xl">
          <p
            class="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-amber-300"
          >
            Один вечер · один общий выбор
          </p>
          <h1
            class="text-balance text-5xl font-semibold leading-[0.95] tracking-tight text-white sm:text-7xl"
          >
            Выберите фильм вместе <br /><span class="text-amber-300"
              >без споров.</span
            >
          </h1>
          <p class="mt-7 max-w-xl text-lg leading-8 text-zinc-300">
            Выберите фильм на вечер вдвоём или с друзьями. Создайте комнату,
            настройте каталог и голосуйте независимо — общий выбор увидят все.
          </p>
          <p class="mt-3 text-sm text-zinc-500">Меньше споров. Больше кино.</p>
          <div
            class="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-400"
          >
            <span>Бесплатно</span><span>Без установки</span
            ><span>Без обязательной регистрации</span>
          </div>
          <button
            class="mt-7 text-sm font-medium text-amber-300 underline decoration-amber-300/30 underline-offset-4"
            @click="showHowItWorks = true"
          >
            Как это работает
          </button>
        </div>

        <div
          id="start"
          class="min-w-0 rounded-[2rem] border border-white/10 bg-zinc-950/75 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8"
        >
          <h2 class="text-2xl font-medium text-white">Начать выбор</h2>
          <p class="mt-2 text-sm text-zinc-400">
            Гостевой профиль создаётся автоматически.
          </p>
          <button
            class="mt-8 w-full rounded-2xl bg-amber-300 px-5 py-4 font-semibold text-zinc-950 transition hover:bg-amber-200 disabled:opacity-50"
            :disabled="loading"
            @click="createRoom('hero')"
          >
            Создать комнату
          </button>
          <NuxtLink
            v-if="lastRoom"
            :to="`/room/${lastRoom._id}`"
            class="mt-3 flex w-full items-center justify-between rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-5 py-4 text-left text-sm text-zinc-200"
          >
            <span
              ><b class="block text-white">Вернуться в комнату</b
              ><span class="text-zinc-500">Код {{ lastRoom.code }}</span></span
            ><span aria-hidden="true">→</span>
          </NuxtLink>
          <div
            class="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-zinc-600"
          >
            <span class="h-px flex-1 bg-white/10" />или войти по коду<span
              class="h-px flex-1 bg-white/10"
            />
          </div>
          <form
            class="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
            @submit.prevent="joinRoom"
          >
            <input
              v-model="code"
              maxlength="6"
              autocomplete="off"
              autocapitalize="characters"
              aria-label="Код комнаты"
              class="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center font-mono text-lg uppercase tracking-[0.3em] text-white outline-none transition focus:border-amber-300"
              placeholder="ABC123"
            />
            <button
              class="min-h-12 rounded-2xl border border-white/15 px-5 text-white transition hover:bg-white/10 disabled:opacity-50"
              :disabled="loading"
            >
              Войти
            </button>
          </form>
        </div>
      </div>
    </section>

    <section class="px-5 pb-20">
      <div
        class="mechanic-shell mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#11141a] p-5 sm:p-8"
      >
        <div class="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p
              class="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300"
            >
              Живая механика
            </p>
            <h2 class="mt-3 text-3xl font-medium text-white sm:text-4xl">
              Комната → свайп → match → итог
            </h2>
            <p class="mt-4 max-w-md text-sm leading-6 text-zinc-400">
              Небольшая репетиция настоящего интерфейса: весь путь продолжается
              сам, но любой этап можно открыть вручную.
            </p>
            <div
              class="mt-6 grid grid-cols-4 gap-2"
              role="tablist"
              aria-label="Этапы выбора фильма"
            >
              <button
                v-for="(step, index) in mechanicSteps"
                :key="step.label"
                type="button"
                role="tab"
                :aria-selected="activeMechanicStep === index"
                class="mechanic-tab min-h-10 rounded-xl border px-2 text-[11px] transition"
                :class="
                  activeMechanicStep === index
                    ? 'is-active border-amber-300/50 bg-amber-300/10 text-amber-200'
                    : 'border-white/10 text-zinc-500 hover:text-white'
                "
                @click="selectMechanicStep(index)"
              >
                {{ step.label }}
              </button>
            </div>
          </div>

          <div
            class="mechanic-stage relative mx-auto min-h-[22rem] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#090b0f] p-4 sm:aspect-[16/10] sm:min-h-0 sm:p-6"
          >
            <div
              class="flex items-center justify-between border-b border-white/10 pb-3"
            >
              <div>
                <span class="font-mono text-xs text-amber-300"
                  >ROOM A7K2QF</span
                >
                <p class="mt-1 text-[10px] text-zinc-600">
                  Film Together · live
                </p>
              </div>
              <div class="flex -space-x-1.5">
                <span
                  v-for="person in ['В', 'А', 'М']"
                  :key="person"
                  class="grid size-7 place-items-center rounded-full border-2 border-[#090b0f] bg-amber-300 text-[10px] font-bold text-zinc-950"
                  >{{ person }}</span
                >
              </div>
            </div>
            <Transition name="mechanic-card" mode="out-in">
              <div
                :key="activeMechanicStep"
                class="grid h-[calc(100%-3rem)] place-items-center py-4 text-center"
              >
                <div v-if="activeMechanicStep === 0" class="w-full max-w-sm">
                  <div class="grid grid-cols-3 gap-2">
                    <div
                      v-for="name in ['Владислав', 'Анна', 'Максим']"
                      :key="name"
                      class="rounded-xl border border-white/10 bg-white/5 p-3"
                    >
                      <span
                        class="mx-auto grid size-8 place-items-center rounded-full bg-amber-300 text-xs font-bold text-zinc-950"
                        >{{ name[0] }}</span
                      >
                      <p class="mt-2 truncate text-xs text-white">{{ name }}</p>
                    </div>
                  </div>
                  <div
                    class="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5"
                  >
                    <i
                      class="mechanic-pulse block h-full w-1/2 rounded-full bg-amber-300"
                    />
                  </div>
                </div>
                <div
                  v-else-if="activeMechanicStep === 1"
                  class="relative h-full w-full max-w-xs"
                >
                  <div
                    class="absolute inset-x-8 inset-y-4 rotate-3 rounded-2xl border border-white/10 bg-zinc-800"
                  />
                  <div
                    class="mechanic-swipe absolute inset-x-10 inset-y-2 -rotate-2 rounded-2xl border border-amber-300/20 bg-gradient-to-br from-zinc-700 via-zinc-900 to-black p-4 text-left shadow-2xl"
                  >
                    <span
                      class="rounded-full bg-amber-300 px-2 py-1 text-[10px] font-bold text-zinc-950"
                      >8.2</span
                    >
                    <div class="absolute inset-x-4 bottom-4">
                      <p class="text-base font-medium text-white">
                        Фильм на вечер
                      </p>
                      <p class="mt-1 text-[11px] text-zinc-400">
                        2025 · 124 мин
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  v-else-if="activeMechanicStep === 2"
                  class="mechanic-match rounded-3xl border border-amber-300/30 bg-amber-300/10 px-8 py-7"
                >
                  <span class="text-4xl text-amber-300">♥</span>
                  <p
                    class="mt-3 text-xs uppercase tracking-[0.22em] text-amber-300"
                  >
                    Это match
                  </p>
                  <p class="mt-2 text-xl font-medium text-white">
                    Выбрали все трое
                  </p>
                </div>
                <div
                  v-else
                  class="grid grid-cols-[4.5rem_1fr] items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
                >
                  <div
                    class="aspect-[2/3] rounded-xl bg-gradient-to-br from-amber-200 via-orange-950 to-black"
                  />
                  <div>
                    <p
                      class="text-[10px] uppercase tracking-[0.2em] text-amber-300"
                    >
                      Итог комнаты
                    </p>
                    <p class="mt-2 text-lg font-medium text-white">
                      Фильм выбран
                    </p>
                    <p class="mt-1 text-xs text-zinc-500">
                      Можно делиться результатом
                    </p>
                  </div>
                </div>
                <div
                  class="absolute bottom-3 left-4 right-4 sm:bottom-5 sm:left-6 sm:right-6"
                >
                  <p class="text-sm font-medium text-white">
                    {{ mechanicSteps[activeMechanicStep]?.title }}
                  </p>
                  <p class="mt-1 text-[11px] text-zinc-500">
                    {{ mechanicSteps[activeMechanicStep]?.text }}
                  </p>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </section>

    <section class="border-y border-white/5 bg-white/[0.02] px-5 py-20">
      <div class="mx-auto max-w-5xl">
        <p
          class="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300"
        >
          Один процесс вместо чата
        </p>
        <h2 class="mt-3 text-3xl font-medium text-white sm:text-5xl">
          Выбирайте, а не пересылайте ссылки
        </h2>
        <div class="mt-9 overflow-hidden rounded-3xl border border-white/10">
          <div
            v-for="row in [
              ['Ссылки и скриншоты в чате', 'Одна общая комната'],
              ['Мнение первого влияет на остальных', 'Независимые решения'],
              ['Бесконечный каталог', 'Подборка и фильтры до старта'],
              ['После списка снова спор', 'Общий match и итоговый фильм'],
            ]"
            :key="row[0]"
            class="grid gap-2 border-b border-white/10 p-4 last:border-0 sm:grid-cols-2 sm:p-5"
          >
            <span class="text-zinc-500">{{ row[0] }}</span
            ><strong class="text-white">{{ row[1] }}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="px-5 py-20">
      <div class="mx-auto max-w-6xl">
        <p
          class="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300"
        >
          Точная подборка до первого свайпа
        </p>
        <div class="mt-4 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <h2 class="text-3xl font-medium text-white sm:text-5xl">
            Уберите лишнее.<br />Оставьте то, что подходит всем.
          </h2>
          <p class="max-w-2xl text-base leading-7 text-zinc-400">
            Выберите или исключите жанры, страны и персон, задайте годы,
            возрастные ограничения и рейтинги Кинопоиска и IMDb. Все участники
            получают одну и ту же подготовленную выборку.
          </p>
        </div>
        <div class="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="item in [
              {
                title: 'Включайте и исключайте',
                text: 'Например, только комедии, но без конкретной страны.',
              },
              {
                title: 'Выбирайте независимо',
                text: 'Никто не подстраивается под первый голос.',
              },
              {
                title: 'Подходит компаниям 2+',
                text: 'Совпадение учитывает всех участников комнаты.',
              },
              {
                title: 'Работает сразу',
                text: 'Браузер, короткая ссылка и никакой установки.',
              },
            ]"
            :key="item.title"
            class="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <h3 class="text-sm font-medium text-white">{{ item.title }}</h3>
            <p class="mt-2 text-xs leading-5 text-zinc-500">{{ item.text }}</p>
          </div>
        </div>
        <div
          class="mt-10 rounded-3xl border border-amber-300/20 bg-amber-300/[0.05] p-5 sm:p-7"
        >
          <p class="text-xs uppercase tracking-[0.2em] text-amber-300">
            Готовые подборки
          </p>
          <h3 class="mt-3 text-2xl font-medium text-white">
            Не обязательно настраивать всё вручную
          </h3>
          <p class="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            В комнате можно выбрать одну или несколько готовых подборок вместо
            ручной настройки жанров, стран, участников фильма, годов и
            рейтингов. Фильмы из выбранных подборок объединяются в одну общую
            очередь для всех.
          </p>
          <div class="mt-5 grid gap-3 sm:grid-cols-3">
            <div
              v-for="item in [
                'Одна или несколько',
                'Без ручной настройки',
                'Общая очередь для всех',
              ]"
              :key="item"
              class="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-zinc-200"
            >
              {{ item }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="border-y border-white/5 bg-white/[0.02] px-5 py-20">
      <div class="mx-auto max-w-6xl">
        <p
          class="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300"
        >
          Как это работает
        </p>
        <h2 class="mt-3 max-w-2xl text-3xl font-medium text-white sm:text-5xl">
          Каждый выбирает сам.<br />Совпадение видят все.
        </h2>
        <div class="mt-10 grid gap-4 md:grid-cols-3">
          <article
            v-for="(item, index) in [
              {
                title: 'Создайте комнату',
                text: 'Без регистрации. Настройте жанры, годы и рейтинги.',
              },
              {
                title: 'Пригласите компанию',
                text: 'Ссылка, QR или короткий код работают в любом браузере.',
              },
              {
                title: 'Свайпайте фильмы',
                text: 'Влево — мимо, вправо — берём. Match появится автоматически.',
              },
            ]"
            :key="item.title"
            class="rounded-3xl border border-white/10 bg-[#11141a] p-6"
          >
            <span class="font-mono text-sm text-zinc-600"
              >0{{ index + 1 }}</span
            >
            <h3 class="mt-8 text-xl text-white">{{ item.title }}</h3>
            <p class="mt-3 text-sm leading-6 text-zinc-400">{{ item.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="px-5 py-20">
      <div class="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p
            class="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300"
          >
            Для пары, друзей и компании
          </p>
          <h2 class="mt-3 text-3xl font-medium text-white sm:text-5xl">
            Не надо листать каталог в одном телефоне
          </h2>
          <p class="mt-5 max-w-xl text-base leading-7 text-zinc-400">
            У каждого свой набор карточек и свой темп. Настройки комнаты
            фиксируют выборку, а realtime сообщает о совпадении сразу всем.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-3xl bg-amber-300 p-5 text-zinc-950">
            <b class="text-3xl">2+</b>
            <p class="mt-8 text-sm">участников в одной комнате</p>
          </div>
          <div class="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <b class="text-3xl text-white">0</b>
            <p class="mt-8 text-sm text-zinc-400">обязательных регистраций</p>
          </div>
          <div
            class="col-span-2 rounded-3xl border border-white/10 bg-white/[0.04] p-5"
          >
            <b class="text-xl text-white">Touch · Mouse · Keyboard</b>
            <p class="mt-3 text-sm text-zinc-400">
              Свайпы на телефоне, перетаскивание мышью и стрелки на клавиатуре.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="border-y border-white/5 bg-white/[0.02] px-5 py-20">
      <div class="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
        <article
          class="rounded-3xl border border-white/10 bg-[#11141a] p-6 sm:p-8"
        >
          <p
            class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300"
          >
            Приватность выбора
          </p>
          <h2 class="mt-3 text-3xl font-medium text-white">
            Ваши свайпы — только ваши
          </h2>
          <p class="mt-4 text-sm leading-7 text-zinc-400">
            Участники голосуют в своём темпе и не видят чужие yes/no. Match
            появляется только при общем выборе. Публичная карточка результата не
            содержит имён, кода комнаты или истории голосов.
          </p>
        </article>
        <article
          class="rounded-3xl border border-amber-300/20 bg-amber-300/[0.06] p-6 sm:p-8"
        >
          <p
            class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300"
          >
            Законченный результат
          </p>
          <h2 class="mt-3 text-3xl font-medium text-white">
            Выберите один фильм
          </h2>
          <p class="mt-4 text-sm leading-7 text-zinc-400">
            Организатор назначает итог среди matches, делится фильмом в
            мессенджере или повторяет комнату с теми же фильтрами.
          </p>
          <button
            type="button"
            class="mt-6 min-h-12 rounded-2xl bg-amber-300 px-5 font-semibold text-zinc-950"
            :disabled="loading"
            @click="createRoom('result')"
          >
            Попробовать бесплатно
          </button>
        </article>
      </div>
    </section>

    <section class="px-5 py-16">
      <div
        class="mx-auto max-w-6xl rounded-3xl border border-white/10 p-6 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8"
      >
        <div>
          <p
            class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300"
          >
            Открытая beta
          </p>
          <h2 class="mt-2 text-2xl font-medium text-white">
            Продукт развивается вместе с первыми компаниями
          </h2>
          <p class="mt-2 text-sm text-zinc-500">
            Без выдуманных отзывов и маркетинговых цифр — только работающий
            совместный выбор.
          </p>
        </div>
        <a
          v-if="config.public.legalEmail"
          :href="`mailto:${config.public.legalEmail}`"
          class="mt-5 inline-flex min-h-11 items-center text-sm text-amber-300 sm:mt-0"
          >Отправить обратную связь →</a
        >
      </div>
    </section>

    <section class="border-y border-white/5 bg-white/[0.02] px-5 py-20">
      <div class="mx-auto max-w-6xl">
        <p
          class="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300"
        >
          Выберите свой сценарий
        </p>
        <h2 class="mt-3 max-w-3xl text-3xl font-medium text-white sm:text-5xl">
          Один механизм для разных компаний
        </h2>
        <p class="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
          Узнайте, как организовать выбор для пары, друзей или компании до 12
          человек — с подходящими фильтрами и без открытого давления на ответы.
        </p>
        <div class="mt-9 grid gap-4 md:grid-cols-3">
          <NuxtLink
            v-for="item in [
              {
                to: '/for-couples',
                title: 'Что посмотреть вдвоём',
                text: 'Приватные решения двух участников и только общие совпадения.',
              },
              {
                to: '/for-friends',
                title: 'Что посмотреть с друзьями',
                text: 'Приглашение ссылкой и независимый выбор на каждом устройстве.',
              },
              {
                to: '/for-groups',
                title: 'Фильм для компании',
                text: 'Единые фильтры и match с учётом каждого из 3–12 участников.',
              },
            ]"
            :key="item.to"
            :to="item.to"
            class="rounded-3xl border border-white/10 bg-[#11141a] p-6 transition hover:border-amber-300/30 hover:bg-amber-300/[0.04]"
          >
            <h3 class="text-xl text-white">{{ item.title }}</h3>
            <p class="mt-3 text-sm leading-6 text-zinc-500">{{ item.text }}</p>
            <span class="mt-6 block text-sm text-amber-300">Подробнее →</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="border-t border-white/5 px-5 py-20">
      <div class="mx-auto max-w-3xl">
        <p
          class="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300"
        >
          FAQ
        </p>
        <h2 class="mt-3 text-3xl font-medium text-white">Частые вопросы</h2>
        <div class="mt-8 divide-y divide-white/10">
          <details
            v-for="(item, index) in faqItems"
            :key="item.question"
            class="group py-5"
            @toggle="onFaqToggle($event, index)"
          >
            <summary
              class="flex cursor-pointer list-none items-center justify-between gap-4 text-lg text-white"
            >
              <span>{{ item.question }}</span
              ><span class="text-zinc-600 transition group-open:rotate-45"
                >+</span
              >
            </summary>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              {{ item.answer }}
            </p>
          </details>
        </div>
      </div>
    </section>

    <section class="px-5 pb-20">
      <div
        class="mx-auto max-w-6xl rounded-[2rem] bg-amber-300 p-7 text-zinc-950 sm:p-12"
      >
        <div
          class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p
              class="text-sm font-semibold uppercase tracking-widest opacity-60"
            >
              Готовы выбрать?
            </p>
            <h2 class="mt-2 text-3xl font-semibold sm:text-5xl">
              Начните с комнаты.
            </h2>
            <p class="mt-3 max-w-xl text-sm opacity-70">
              Бесплатно, без установки и обязательной регистрации.
            </p>
          </div>
          <button
            class="min-h-14 rounded-2xl bg-zinc-950 px-7 font-semibold text-white"
            :disabled="loading"
            @click="createRoom('final')"
          >
            Создать бесплатно
          </button>
        </div>
        <p class="mt-6 text-xs opacity-60">
          Продолжая, вы принимаете
          <NuxtLink to="/legal/terms" class="underline"
            >пользовательское соглашение</NuxtLink
          >
          и знакомитесь с
          <NuxtLink to="/legal/privacy" class="underline"
            >политикой обработки данных</NuxtLink
          >.
        </p>
      </div>
    </section>

    <design-system-modal
      v-model:is-open="showHowItWorks"
      title="Три шага до фильма"
    >
      <ol class="space-y-4">
        <li class="rounded-2xl bg-white/5 p-4">
          <b class="text-amber-300">1. Создайте</b>
          <p class="mt-1 text-sm text-zinc-400">
            Регистрация не нужна — достаточно указать имя.
          </p>
        </li>
        <li class="rounded-2xl bg-white/5 p-4">
          <b class="text-amber-300">2. Пригласите</b>
          <p class="mt-1 text-sm text-zinc-400">
            Поделитесь ссылкой, QR-кодом или коротким кодом.
          </p>
        </li>
        <li class="rounded-2xl bg-white/5 p-4">
          <b class="text-amber-300">3. Свайпайте</b>
          <p class="mt-1 text-sm text-zinc-400">
            Влево — пропустить, вправо — выбрать. Общий выбор станет match.
          </p>
        </li>
      </ol>
    </design-system-modal>
  </div>
</template>

<style scoped>
.mechanic-shell {
  background:
    radial-gradient(circle at 82% 45%, rgb(251 191 36 / 0.09), transparent 34%),
    #11141a;
}
.mechanic-stage {
  box-shadow: 0 28px 70px rgb(0 0 0 / 0.42);
}
.mechanic-tab.is-active {
  box-shadow: inset 0 -2px 0 rgb(251 191 36 / 0.85);
}
.mechanic-pulse {
  animation: mechanic-pulse 1.5s ease-in-out infinite alternate;
}
.mechanic-swipe {
  animation: mechanic-swipe 2.1s ease-in-out infinite;
  transform-origin: 50% 90%;
}
.mechanic-match {
  animation: mechanic-match 1.2s ease-in-out infinite alternate;
}
.mechanic-card-enter-active,
.mechanic-card-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s ease;
}
.mechanic-card-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
.mechanic-card-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
@keyframes mechanic-pulse {
  to {
    width: 100%;
  }
}
@keyframes mechanic-swipe {
  0%,
  100% {
    transform: rotate(-2deg) translateX(0);
  }
  50% {
    transform: rotate(4deg) translateX(16px);
  }
}
@keyframes mechanic-match {
  to {
    transform: scale(1.035);
    box-shadow: 0 0 36px rgb(251 191 36 / 0.14);
  }
}
@media (prefers-reduced-motion: reduce) {
  .mechanic-pulse,
  .mechanic-swipe,
  .mechanic-match {
    animation: none;
  }
  .mechanic-card-enter-active,
  .mechanic-card-leave-active {
    transition: none;
  }
}
</style>
