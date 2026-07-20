<script setup lang="ts">
definePageMeta({ middleware: 'admin' });

type Section =
  | 'dashboard'
  | 'films'
  | 'groups'
  | 'tags'
  | 'countries'
  | 'persons'
  | 'positions';
type AdminFilm = {
  _id: string;
  name: string | null;
  name_en?: string | null;
  poster_url?: string | null;
  year?: number | null;
  verified: boolean;
  deleted: boolean;
  description?: string | null;
  rating?: number | null;
  rating_age?: number | null;
  rating_mpaa?: string | null;
  description_en?: string | null;
  duration?: number | null;
  trailer_url?: string | null;
  cover_url?: string | null;
  countries?: string[];
  tags?: string[];
  persons?: unknown[];
  groups?: string[];
};
type AdminReference = { _id: string; name: string; verified: boolean };
type AdminDashboard = {
  totals: Record<
    | 'films'
    | 'verifiedFilms'
    | 'pendingFilms'
    | 'users'
    | 'guests'
    | 'rooms'
    | 'activeRooms'
    | 'matchedFilms',
    number
  >;
  activity: Record<
    'day' | 'week' | 'month',
    { users: number; guests: number; total: number }
  >;
  daily: Array<{ date: string; rooms: number; users: number; guests: number }>;
  roomFunnel: {
    statuses: { created: number; started: number; closed: number };
    matchedRooms: number;
    matchedRoomShare: number;
    averageMatches: number;
    medianMatches: number;
    averageParticipants: number;
    participantRooms: { solo: number; pair: number; group: number };
    filterUsage: Record<string, number>;
    finalizedRooms: number;
    finalizedClosedShare: number;
    repeatedRooms: number;
  };
};

const section = ref<Section>('dashboard');
const search = ref('');
const verified = ref('');
const missing = ref('');
const groupId = ref('');
const items = ref<AdminFilm[]>([]);
const groupOptions = ref<AdminReference[]>([]);
const tagOptions = ref<AdminReference[]>([]);
const countryOptions = ref<AdminReference[]>([]);
const total = ref(0);
const limit = 20;
const offset = ref(0);
const dashboard = ref<AdminDashboard | null>(null);
const selected = ref<AdminFilm | null>(null);
const selectedOriginal = ref<AdminFilm | null>(null);
const filmDetails = ref<AdminFilm | null>(null);
const error = ref('');
const isLoading = ref(false);
const wrappedFetch = useWrappedFetch();
const filmEditableKeys = [
  'name',
  'name_en',
  'description',
  'description_en',
  'rating',
  'duration',
  'rating_age',
  'rating_mpaa',
  'year',
  'poster_url',
  'cover_url',
  'trailer_url',
  'countries',
  'tags',
  'groups',
  'verified',
] as const satisfies ReadonlyArray<keyof AdminFilm>;

const labels: Record<Section, string> = {
  dashboard: 'Дашборд',
  films: 'Фильмы',
  groups: 'Подборки',
  tags: 'Жанры',
  countries: 'Страны',
  persons: 'Персоны',
  positions: 'Профессии',
};
const sections: Section[] = [
  'dashboard',
  'films',
  'groups',
  'tags',
  'countries',
  'persons',
  'positions',
];

const loadFilmOptions = async () => {
  if (
    groupOptions.value.length &&
    tagOptions.value.length &&
    countryOptions.value.length
  )
    return;
  const [groups, tags, countries] = await Promise.all([
    wrappedFetch<{ items: AdminReference[] }>('/admin/groups?limit=100'),
    wrappedFetch<{ items: AdminReference[] }>('/admin/tags?limit=100'),
    wrappedFetch<{ items: AdminReference[] }>('/admin/countries?limit=100'),
  ]);
  groupOptions.value = groups.items;
  tagOptions.value = tags.items;
  countryOptions.value = countries.items;
};

const maxDaily = computed(() =>
  Math.max(
    1,
    ...(dashboard.value?.daily ?? []).map(
      (item) => item.rooms + item.users + item.guests,
    ),
  ),
);
const userShare = computed(() => {
  const users = dashboard.value?.totals.users ?? 0;
  const guests = dashboard.value?.totals.guests ?? 0;
  return users + guests ? Math.round((users / (users + guests)) * 100) : 0;
});
const missingFields = (film: AdminFilm) =>
  [
    !film.poster_url && 'постер',
    !film.trailer_url && 'видео',
    !film.description && 'описание',
    !film.countries?.length && 'страны',
    !film.tags?.length && 'жанры',
  ].filter(Boolean) as string[];
const currentPage = computed(() => Math.floor(offset.value / limit) + 1);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit)));
const pageStart = computed(() => (total.value ? offset.value + 1 : 0));
const pageEnd = computed(() =>
  Math.min(offset.value + items.value.length, total.value),
);

async function refresh() {
  error.value = '';
  isLoading.value = true;
  try {
    if (section.value === 'dashboard') {
      dashboard.value = await wrappedFetch<AdminDashboard>('/admin/dashboard');
      return;
    }
    if (section.value === 'films') await loadFilmOptions();
    const params = new URLSearchParams();
    if (search.value) params.set('search', search.value);
    if (section.value === 'films' && verified.value)
      params.set('verified', verified.value);
    if (section.value === 'films' && missing.value)
      params.set('missing', missing.value);
    if (section.value === 'films' && groupId.value)
      params.set('group_id', groupId.value);
    params.set('limit', String(section.value === 'films' ? limit : 100));
    params.set('offset', String(section.value === 'films' ? offset.value : 0));
    const response = await wrappedFetch<{
      items: AdminFilm[];
      meta: { total: number };
    }>(`/admin/${section.value}?${params}`);
    items.value = response.items;
    total.value = response.meta.total;
  } catch {
    error.value = 'Не удалось загрузить данные админки.';
  } finally {
    isLoading.value = false;
  }
}

async function select(next: Section) {
  section.value = next;
  search.value = '';
  verified.value = '';
  missing.value = '';
  groupId.value = '';
  offset.value = 0;
  selected.value = null;
  selectedOriginal.value = null;
  filmDetails.value = null;
  await refresh();
}

async function openFilm(film: AdminFilm) {
  error.value = '';
  try {
    filmDetails.value = await wrappedFetch<AdminFilm>(
      `/admin/films/${film._id}`,
    );
  } catch {
    error.value = 'Не удалось открыть карточку фильма.';
  }
}

async function verify(film: Pick<AdminFilm, '_id'>) {
  await wrappedFetch(`/admin/films/${film._id}/verify`, { method: 'PATCH' });
  await refresh();
}

function beginEdit(film: AdminFilm) {
  const copy = JSON.parse(
    JSON.stringify({
      ...film,
      countries: film.countries ?? [],
      tags: film.tags ?? [],
      groups: film.groups ?? [],
    }),
  ) as AdminFilm;
  selected.value = copy;
  selectedOriginal.value = JSON.parse(JSON.stringify(copy)) as AdminFilm;
}

async function save() {
  if (!selected.value) return;
  const resource = section.value === 'films' ? 'films' : section.value;
  const body =
    section.value === 'films'
      ? Object.fromEntries(
          filmEditableKeys
            .filter(
              (key) =>
                JSON.stringify(selected.value?.[key]) !==
                JSON.stringify(selectedOriginal.value?.[key]),
            )
            .map((key) => [key, selected.value?.[key] ?? null]),
        )
      : selected.value;
  await wrappedFetch(`/admin/${resource}/${selected.value._id}`, {
    method: 'PATCH',
    body,
  });
  selected.value = null;
  selectedOriginal.value = null;
  await refresh();
}

async function applyFilters() {
  offset.value = 0;
  await refresh();
}

async function changePage(direction: -1 | 1) {
  const nextOffset = offset.value + direction * limit;
  if (nextOffset < 0 || nextOffset >= total.value) return;
  offset.value = nextOffset;
  await refresh();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function remove(item: Pick<AdminFilm, '_id' | 'name'>) {
  if (!confirm(`Скрыть «${item.name}»?`)) return;
  const resource = section.value === 'films' ? 'films' : section.value;
  await wrappedFetch(`/admin/${resource}/${item._id}`, { method: 'DELETE' });
  await refresh();
}

async function createReference() {
  const name = prompt('Название новой записи');
  if (!name || section.value === 'dashboard' || section.value === 'films')
    return;
  await wrappedFetch(`/admin/${section.value}`, {
    method: 'POST',
    body: { name },
  });
  await refresh();
}

onMounted(refresh);
</script>

<template>
  <div
    class="admin-root cinematic-grid min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6"
  >
    <div class="admin-grid mx-auto max-w-6xl">
      <aside class="admin-nav">
        <button
          v-for="item in sections"
          :key="item"
          class="shrink-0 rounded-xl px-3 py-2 text-left text-sm transition"
          :class="
            section === item
              ? 'bg-amber-300 font-semibold text-zinc-950'
              : 'text-zinc-400 hover:bg-white/10 hover:text-white'
          "
          @click="select(item)"
        >
          {{ labels[item] }}
        </button>
      </aside>
      <section class="admin-content">
        <p class="mb-1 text-sm uppercase tracking-[0.18em] text-amber-300">
          Управление каталогом
        </p>
        <h1 class="mb-5 text-3xl font-semibold text-white">
          {{ labels[section] }}
        </h1>
        <p
          v-if="error"
          class="mb-4 rounded-xl border border-red-400/30 bg-red-950/40 p-3 text-sm text-red-200"
        >
          {{ error }}
        </p>

        <template v-if="section === 'dashboard'">
          <div v-if="dashboard" class="admin-metrics">
            <div
              v-for="metric in [
                { label: 'Комнат всего', value: dashboard.totals.rooms },
                {
                  label: 'Активных комнат',
                  value: dashboard.totals.activeRooms,
                },
                { label: 'Совпадений', value: dashboard.totals.matchedFilms },
                { label: 'Пользователей', value: dashboard.totals.users },
                { label: 'Гостей', value: dashboard.totals.guests },
                {
                  label: 'Фильмов в пуле',
                  value: dashboard.totals.verifiedFilms,
                },
              ]"
              :key="metric.label"
              class="rounded-2xl border border-white/10 bg-zinc-950/80 p-4"
            >
              <p class="text-xs text-zinc-500">{{ metric.label }}</p>
              <strong class="mt-1 block text-3xl text-white">{{
                metric.value
              }}</strong>
            </div>
          </div>
          <div v-if="dashboard" class="admin-analytics">
            <section class="admin-panel">
              <h2>Активность аудитории</h2>
              <div class="activity-grid">
                <div
                  v-for="period in [
                    { key: 'day', label: '24 часа' },
                    { key: 'week', label: '7 дней' },
                    { key: 'month', label: '30 дней' },
                  ]"
                  :key="period.key"
                >
                  <strong>{{ dashboard.activity[period.key].total }}</strong
                  ><span>{{ period.label }}</span
                  ><small
                    >{{ dashboard.activity[period.key].users }} польз. ·
                    {{ dashboard.activity[period.key].guests }} гост.</small
                  >
                </div>
              </div>
            </section>
            <section class="admin-panel audience-panel">
              <div
                class="audience-donut"
                :style="{
                  background: `conic-gradient(#f7c948 0 ${userShare}%, #52525b ${userShare}% 100%)`,
                }"
              >
                <div>
                  <strong>{{ userShare }}%</strong><span>аккаунты</span>
                </div>
              </div>
              <div>
                <h2>Аудитория</h2>
                <p>
                  <i class="legend-user" />
                  {{ dashboard.totals.users }} пользователей
                </p>
                <p>
                  <i class="legend-guest" />
                  {{ dashboard.totals.guests }} гостей
                </p>
              </div>
            </section>
          </div>
          <section
            v-if="dashboard?.daily?.length"
            class="admin-panel admin-chart"
          >
            <div class="chart-heading">
              <h2>Новые комнаты и аудитория за 30 дней</h2>
              <div>
                <span class="chart-room">Комнаты</span
                ><span class="chart-user">Пользователи</span
                ><span class="chart-guest">Гости</span>
              </div>
            </div>
            <div class="chart-bars">
              <div
                v-for="day in dashboard.daily"
                :key="day.date"
                class="chart-day"
                :title="`${day.date}: ${day.rooms} комнат, ${day.users} пользователей, ${day.guests} гостей`"
              >
                <div
                  class="chart-stack"
                  :style="{
                    height: `${Math.max(4, ((day.rooms + day.users + day.guests) / maxDaily) * 100)}%`,
                  }"
                >
                  <i
                    v-if="day.guests"
                    class="bar-guests"
                    :style="{ flex: day.guests }"
                  /><i
                    v-if="day.users"
                    class="bar-users"
                    :style="{ flex: day.users }"
                  /><i
                    v-if="day.rooms"
                    class="bar-rooms"
                    :style="{ flex: day.rooms }"
                  />
                </div>
              </div>
            </div>
          </section>
          <section v-if="dashboard" class="admin-panel room-funnel-panel">
            <h2>Воронка комнат</h2>
            <div class="activity-grid">
              <div>
                <strong>{{ dashboard.roomFunnel.statuses.created }}</strong
                ><span>Ожидают старта</span>
              </div>
              <div>
                <strong>{{ dashboard.roomFunnel.statuses.started }}</strong
                ><span>Идёт выбор</span>
              </div>
              <div>
                <strong>{{ dashboard.roomFunnel.statuses.closed }}</strong
                ><span>Завершены</span>
              </div>
              <div>
                <strong>{{ dashboard.roomFunnel.matchedRoomShare }}%</strong
                ><span>Комнат с match</span
                ><small
                  >{{ dashboard.roomFunnel.matchedRooms }} комнат · в среднем
                  {{ dashboard.roomFunnel.averageMatches }}</small
                >
              </div>
              <div>
                <strong>{{ dashboard.roomFunnel.finalizedClosedShare }}%</strong
                ><span>С итоговым фильмом</span
                ><small
                  >{{ dashboard.roomFunnel.finalizedRooms }} завершений</small
                >
              </div>
              <div>
                <strong>{{ dashboard.roomFunnel.repeatedRooms }}</strong
                ><span>Повторных комнат</span
                ><small
                  >Среднее участников:
                  {{ dashboard.roomFunnel.averageParticipants }}</small
                >
              </div>
            </div>
          </section>
        </template>

        <template v-else-if="filmDetails">
          <article class="film-detail-card">
            <div class="film-detail-poster">
              <film-poster
                :src="filmDetails.poster_url"
                :alt="filmDetails.name || 'Фильм без названия'"
                class="aspect-[2/3] w-full"
              />
            </div>
            <div class="film-detail-body">
              <div class="film-detail-heading">
                <div>
                  <p class="film-detail-original">
                    {{
                      filmDetails.name_en || 'Оригинальное название не указано'
                    }}
                  </p>
                  <h2>{{ filmDetails.name }}</h2>
                </div>
                <span
                  class="admin-status"
                  :class="filmDetails.verified ? 'is-verified' : 'is-pending'"
                  >{{ filmDetails.verified ? 'В пуле' : 'На проверке' }}</span
                >
              </div>
              <dl class="film-meta">
                <div>
                  <dt>Год</dt>
                  <dd>{{ filmDetails.year || '—' }}</dd>
                </div>
                <div>
                  <dt>Длительность</dt>
                  <dd>
                    {{
                      filmDetails.duration
                        ? `${filmDetails.duration} мин.`
                        : '—'
                    }}
                  </dd>
                </div>
                <div>
                  <dt>Рейтинг</dt>
                  <dd>
                    {{
                      filmDetails.rating ? filmDetails.rating.toFixed(1) : '—'
                    }}
                  </dd>
                </div>
                <div>
                  <dt>Возраст</dt>
                  <dd>
                    {{
                      filmDetails.rating_age
                        ? `${filmDetails.rating_age}+`
                        : '—'
                    }}
                  </dd>
                </div>
                <div>
                  <dt>MPAA</dt>
                  <dd>{{ filmDetails.rating_mpaa || '—' }}</dd>
                </div>
              </dl>
              <p class="film-description">
                {{ filmDetails.description || 'Описание не заполнено.' }}
              </p>
              <p
                v-if="filmDetails.description_en"
                class="film-description film-description-en"
              >
                {{ filmDetails.description_en }}
              </p>
              <p class="film-links">
                <a
                  v-if="filmDetails.trailer_url"
                  :href="filmDetails.trailer_url"
                  target="_blank"
                  rel="noopener"
                  >Трейлер ↗</a
                ><a
                  v-if="filmDetails.cover_url"
                  :href="filmDetails.cover_url"
                  target="_blank"
                  rel="noopener"
                  >Обложка ↗</a
                >
              </p>
              <div class="film-detail-actions">
                <NuxtLink :to="`/film/${filmDetails._id}`" class="film-button">
                  Открыть на сайте
                </NuxtLink>
                <button
                  v-if="!filmDetails.verified"
                  class="film-button film-button-primary"
                  @click="
                    verify(filmDetails);
                    filmDetails = null;
                  "
                >
                  Верифицировать</button
                ><button
                  class="film-button"
                  @click="
                    beginEdit(filmDetails);
                    filmDetails = null;
                  "
                >
                  Редактировать</button
                ><button
                  class="film-button film-button-danger"
                  @click="
                    remove(filmDetails);
                    filmDetails = null;
                  "
                >
                  Скрыть</button
                ><button class="film-button" @click="filmDetails = null">
                  К списку
                </button>
              </div>
            </div>
          </article>
        </template>

        <template v-else-if="selected">
          <div
            class="max-w-3xl space-y-5 rounded-2xl border border-white/10 bg-zinc-950/80 p-5"
          >
            <label class="block text-sm text-zinc-300"
              >Название<input
                v-model="selected.name"
                class="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
            /></label>
            <label class="block text-sm text-zinc-300"
              >Название на английском<input
                v-model="selected.name_en"
                class="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white"
            /></label>
            <template v-if="section === 'films'">
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label class="block text-sm text-zinc-300"
                  >Год<input
                    v-model.number="selected.year"
                    type="number"
                    min="1888"
                    class="admin-input" /></label
                ><label class="block text-sm text-zinc-300"
                  >Длительность, мин.<input
                    v-model.number="selected.duration"
                    type="number"
                    min="0"
                    class="admin-input" /></label
                ><label class="block text-sm text-zinc-300"
                  >Возраст<input
                    v-model.number="selected.rating_age"
                    type="number"
                    min="0"
                    class="admin-input" /></label
                ><label class="block text-sm text-zinc-300"
                  >MPAA<select
                    v-model="selected.rating_mpaa"
                    class="admin-input"
                  >
                    <option :value="null">Не указан</option>
                    <option
                      v-for="rating in ['G', 'PG', 'PG13', 'R', 'NC17']"
                      :key="rating"
                      :value="rating"
                    >
                      {{ rating }}
                    </option>
                  </select></label
                >
              </div>
              <div>
                <label class="block text-sm text-zinc-300"
                  >Рейтинг<input
                    v-model.number="selected.rating"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    class="admin-input"
                /></label>
              </div>
              <label class="block text-sm text-zinc-300"
                >URL постера<input
                  v-model="selected.poster_url"
                  class="admin-input" /></label
              ><label class="block text-sm text-zinc-300"
                >URL фоновой картинки<input
                  v-model="selected.cover_url"
                  class="admin-input" /></label
              ><label class="block text-sm text-zinc-300"
                >URL трейлера<input
                  v-model="selected.trailer_url"
                  class="admin-input"
              /></label>
              <label class="block text-sm text-zinc-300"
                >Описание<textarea
                  v-model="selected.description"
                  rows="5"
                  class="admin-input"
                /></label
              ><label class="block text-sm text-zinc-300"
                >Описание на английском<textarea
                  v-model="selected.description_en"
                  rows="4"
                  class="admin-input"
                />
              </label>
              <fieldset>
                <legend class="mb-2 text-sm text-zinc-300">Страны</legend>
                <div class="admin-checkbox-grid">
                  <label v-for="country in countryOptions" :key="country._id"
                    ><input
                      v-model="selected.countries"
                      type="checkbox"
                      :value="country._id"
                    />
                    {{ country.name }}</label
                  >
                </div>
              </fieldset>
              <fieldset>
                <legend class="mb-2 text-sm text-zinc-300">Жанры</legend>
                <div class="admin-checkbox-grid">
                  <label v-for="tag in tagOptions" :key="tag._id"
                    ><input
                      v-model="selected.tags"
                      type="checkbox"
                      :value="tag._id"
                    />
                    {{ tag.name }}</label
                  >
                </div>
              </fieldset>
              <fieldset>
                <legend class="mb-2 text-sm text-zinc-300">Подборки</legend>
                <div class="admin-checkbox-grid">
                  <label v-for="group in groupOptions" :key="group._id"
                    ><input
                      v-model="selected.groups"
                      type="checkbox"
                      :value="group._id"
                    />
                    {{ group.name }}</label
                  >
                </div>
              </fieldset>
              <p
                class="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-zinc-400"
              >
                Состав команды фильма здесь не редактируется. Персоны доступны
                только для просмотра и управления в собственном разделе.
              </p>
            </template>
            <label class="flex items-center gap-2 text-sm text-zinc-300"
              ><input v-model="selected.verified" type="checkbox" />
              Верифицировано</label
            >
            <div class="flex gap-2">
              <button
                class="rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950"
                @click="save"
              >
                Сохранить</button
              ><button
                class="rounded-xl bg-white/10 px-4 py-2 text-sm text-white"
                @click="
                  selected = null;
                  selectedOriginal = null;
                "
              >
                Отмена
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <input
              v-model="search"
              placeholder="Поиск"
              class="rounded-xl border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white"
              @keyup.enter="applyFilters"
            /><select
              v-if="section === 'films'"
              v-model="verified"
              class="rounded-xl border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white"
              @change="applyFilters"
            >
              <option value="">Все статусы</option>
              <option value="false">На проверке</option>
              <option value="true">В пуле</option></select
            ><select
              v-if="section === 'films'"
              v-model="missing"
              class="rounded-xl border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white"
              @change="applyFilters"
            >
              <option value="">Любая заполненность</option>
              <option value="any">Есть незаполненные поля</option>
              <option value="poster">Нет постера</option>
              <option value="trailer">Нет видео</option>
              <option value="description">Нет описания</option>
              <option value="countries">Нет стран</option>
              <option value="tags">Нет жанров</option></select
            ><select
              v-if="section === 'films'"
              v-model="groupId"
              class="rounded-xl border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white"
              @change="applyFilters"
            >
              <option value="">Все подборки</option>
              <option
                v-for="group in groupOptions"
                :key="group._id"
                :value="group._id"
              >
                {{ group.name }}
              </option></select
            ><button
              class="rounded-xl bg-white/10 px-4 py-2 text-sm text-white"
              @click="applyFilters"
            >
              Найти</button
            ><button
              v-if="section !== 'films'"
              class="rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950"
              @click="createReference"
            >
              Добавить</button
            ><span class="text-sm text-zinc-500">{{ total }} записей</span>
          </div>
          <div v-if="section === 'films'" class="film-admin-grid">
            <article
              v-for="item in items"
              :key="item._id"
              class="film-admin-card"
              @click="openFilm(item)"
            >
              <film-poster
                :src="item.poster_url"
                :alt="item.name || 'Фильм без названия'"
                class="aspect-[2/3] w-full"
              />
              <div class="film-admin-info">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <h3 class="line-clamp-2 text-sm font-semibold text-white">
                      {{ item.name || 'Без названия' }}
                    </h3>
                    <p class="mt-1 text-xs text-zinc-500">
                      {{ item.year || 'Год не указан' }}
                    </p>
                  </div>
                  <span
                    class="admin-status"
                    :class="item.verified ? 'is-verified' : 'is-pending'"
                    >{{ item.verified ? 'В пуле' : 'Проверить' }}</span
                  >
                </div>
                <div
                  v-if="missingFields(item).length"
                  class="mt-3 flex flex-wrap gap-1"
                >
                  <span
                    v-for="field in missingFields(item).slice(0, 4)"
                    :key="field"
                    class="rounded bg-red-400/10 px-1.5 py-1 text-[10px] text-red-200"
                    >нет: {{ field }}</span
                  >
                </div>
                <div class="mt-4 flex flex-wrap gap-2" @click.stop>
                  <button
                    v-if="!item.verified"
                    class="text-xs text-amber-300"
                    @click="verify(item)"
                  >
                    В пул</button
                  ><button
                    class="text-xs text-zinc-300"
                    @click="beginEdit(item)"
                  >
                    Изменить</button
                  ><button class="text-xs text-red-300" @click="remove(item)">
                    Скрыть
                  </button>
                </div>
              </div>
            </article>
            <p v-if="isLoading" class="text-sm text-zinc-500">Загрузка…</p>
          </div>
          <nav
            v-if="section === 'films' && total > limit"
            class="admin-pagination"
            aria-label="Пагинация фильмов"
          >
            <button :disabled="offset === 0" @click="changePage(-1)">
              ← Назад</button
            ><span
              >{{ pageStart }}–{{ pageEnd }} из {{ total }} · страница
              {{ currentPage }} из {{ pageCount }}</span
            ><button :disabled="offset + limit >= total" @click="changePage(1)">
              Дальше →
            </button>
          </nav>
          <div
            v-else
            class="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/80"
          >
            <table class="w-full min-w-[42rem] table-fixed text-left text-sm">
              <thead
                class="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500"
              >
                <tr>
                  <th class="p-3">Название</th>
                  <th class="w-28 p-3">Статус</th>
                  <th class="w-48 p-3" />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in items"
                  :key="item._id"
                  class="h-16 border-b border-white/5 last:border-0"
                >
                  <td class="p-3">
                    <p class="truncate font-medium text-white">
                      {{ item.name }}
                    </p>
                    <p class="truncate text-xs text-zinc-500">
                      {{ item.name_en }}
                    </p>
                  </td>
                  <td class="p-3">
                    <span
                      class="text-xs"
                      :class="
                        item.verified ? 'text-emerald-300' : 'text-amber-300'
                      "
                      >{{ item.verified ? 'Активна' : 'Черновик' }}</span
                    >
                  </td>
                  <td class="p-3">
                    <div class="flex flex-wrap gap-2">
                      <button
                        class="text-xs text-zinc-300"
                        @click="beginEdit(item)"
                      >
                        Изменить</button
                      ><button
                        class="text-xs text-red-300"
                        @click="remove(item)"
                      >
                        Скрыть
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="isLoading" class="p-4 text-sm text-zinc-500">Загрузка…</p>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.admin-root {
  color: #e4e4e7;
  background: #111216;
  mask-image: none;
}

.admin-grid {
  display: grid;
  grid-template-columns: 176px minmax(0, 1fr);
  gap: 20px;
}

.admin-nav {
  align-self: start;
  display: grid;
  gap: 4px;
  padding: 8px;
  border: 1px solid #34363e;
  border-radius: 12px;
  background: #1c1e24;
}

.admin-nav button {
  width: 100%;
  border-radius: 8px;
  color: #b6bac5 !important;
}

.admin-nav button:hover {
  background: #2a2d35 !important;
  color: #fff !important;
}
.admin-nav button.bg-amber-300 {
  background: #f7c948 !important;
  color: #171717 !important;
}

.admin-content :deep(h1) {
  color: #fff !important;
}
.admin-content :deep(.text-zinc-500) {
  color: #a1a1aa !important;
}
.admin-content :deep(.text-zinc-300) {
  color: #d4d4d8 !important;
}

.admin-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.admin-metrics > div {
  min-height: 88px;
  border-color: #3a3d46 !important;
  border-radius: 10px !important;
  background: #1c1e24 !important;
  box-shadow: none;
}

.admin-metrics :deep(strong) {
  color: #fff !important;
  font-size: 1.7rem !important;
}

.admin-analytics {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 12px;
  margin-top: 12px;
}
.admin-panel {
  border: 1px solid #3a3d46;
  border-radius: 10px;
  background: #1c1e24;
  padding: 16px;
}
.room-funnel-panel {
  margin-top: 12px;
}
.admin-panel h2 {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}
.activity-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 14px;
}
.activity-grid > div {
  padding: 12px;
  border-radius: 8px;
  background: #292c34;
}
.activity-grid strong,
.activity-grid span,
.activity-grid small {
  display: block;
}
.activity-grid strong {
  color: #fff;
  font-size: 24px;
}
.activity-grid span {
  margin-top: 2px;
  color: #d4d4d8;
  font-size: 12px;
}
.activity-grid small {
  margin-top: 7px;
  color: #a1a1aa;
  font-size: 10px;
}
.audience-panel {
  display: flex;
  align-items: center;
  gap: 18px;
}
.audience-donut {
  display: grid;
  width: 112px;
  height: 112px;
  flex: 0 0 112px;
  place-items: center;
  border-radius: 50%;
}
.audience-donut > div {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  align-content: center;
  border-radius: 50%;
  background: #1c1e24;
}
.audience-donut strong {
  color: #fff;
  font-size: 20px;
}
.audience-donut span {
  color: #a1a1aa;
  font-size: 10px;
}
.audience-panel p {
  margin-top: 9px;
  color: #d4d4d8;
  font-size: 12px;
}
.audience-panel i {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 5px;
  border-radius: 50%;
}
.legend-user {
  background: #f7c948;
}
.legend-guest {
  background: #52525b;
}
.admin-chart {
  margin-top: 12px;
}
.chart-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.chart-heading span {
  margin-left: 12px;
  color: #a1a1aa;
  font-size: 10px;
}
.chart-heading span::before {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 4px;
  border-radius: 2px;
}
.chart-room::before {
  background: #f7c948;
}
.chart-user::before {
  background: #34d399;
}
.chart-guest::before {
  background: #71717a;
}
.chart-bars {
  display: flex;
  height: 170px;
  align-items: end;
  gap: 4px;
  margin-top: 18px;
  border-bottom: 1px solid #3f3f46;
}
.chart-day {
  display: flex;
  height: 100%;
  flex: 1;
  align-items: end;
}
.chart-stack {
  display: flex;
  width: 100%;
  min-width: 3px;
  flex-direction: column;
  justify-content: end;
  overflow: hidden;
  border-radius: 3px 3px 0 0;
}
.chart-stack i {
  display: block;
  min-height: 2px;
}
.bar-rooms {
  background: #f7c948;
}
.bar-users {
  background: #34d399;
}
.bar-guests {
  background: #71717a;
}

.film-admin-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
.film-admin-card {
  overflow: hidden;
  border: 1px solid #34363e;
  border-radius: 10px;
  background: #1c1e24;
  cursor: pointer;
  transition:
    transform 0.15s,
    border-color 0.15s;
}
.film-admin-card:hover {
  transform: translateY(-2px);
  border-color: #5a5e69;
}
.film-admin-info {
  padding: 12px;
}

.admin-status {
  font-size: 12px;
  font-weight: 500;
}
.is-verified {
  color: #6ee7b7;
}
.is-pending {
  color: #fcd34d;
}

.admin-poster {
  display: block;
  width: 32px !important;
  min-width: 32px;
  max-width: 32px !important;
  height: 48px !important;
  max-height: 48px !important;
  flex: 0 0 32px;
  border-radius: 4px;
  object-fit: cover;
  background: rgb(39 39 42);
}

.film-detail-card {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 24px;
  padding: 20px;
  border: 1px solid #3a3d46;
  border-radius: 12px;
  background: #1c1e24;
}

.film-detail-poster > * {
  display: block;
  width: 180px;
  min-height: 270px;
  border-radius: 8px;
  background: #292c34;
  object-fit: cover;
}
.film-poster-placeholder {
  display: grid;
  place-items: center;
  color: #a1a1aa;
  font-size: 13px;
}
.film-detail-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.film-detail-heading h2 {
  margin: 2px 0 0;
  color: #fff;
  font-size: 26px;
  line-height: 1.2;
}
.film-detail-original {
  margin: 0;
  color: #a1a1aa;
  font-size: 14px;
}
.film-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 22px 0;
}
.film-meta > div {
  padding: 10px;
  border-radius: 8px;
  background: #292c34;
}
.film-meta dt {
  color: #a1a1aa;
  font-size: 11px;
}
.film-meta dd {
  margin: 4px 0 0;
  color: #fff;
  font-size: 14px;
}
.film-description {
  margin: 0 0 12px;
  color: #e4e4e7;
  line-height: 1.55;
  white-space: pre-line;
}
.film-description-en {
  color: #a1a1aa;
}
.film-links {
  display: flex;
  gap: 14px;
  margin: 16px 0;
}
.film-links a {
  color: #f7c948;
  font-size: 14px;
}
.film-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
}
.film-button {
  padding: 8px 12px;
  border: 1px solid #484b55;
  border-radius: 7px;
  background: #292c34;
  color: #fff;
  font-size: 13px;
}
.film-button:hover {
  background: #343741;
}
.film-button-primary {
  border-color: #f7c948;
  background: #f7c948;
  color: #171717;
  font-weight: 600;
}
.film-button-danger {
  color: #fca5a5;
}

.admin-input {
  display: block;
  width: 100%;
  margin-top: 4px;
  padding: 8px 12px;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 12px;
  background: rgb(0 0 0 / 30%);
  color: #fff;
}

.admin-checkbox-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  max-height: 220px;
  gap: 6px;
  overflow-y: auto;
  padding-right: 4px;
}

.admin-checkbox-grid label {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  background: rgb(255 255 255 / 5%);
  color: #d4d4d8;
  font-size: 13px;
}

.admin-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  color: #a1a1aa;
  font-size: 13px;
}

.admin-pagination button {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid #484b55;
  border-radius: 10px;
  background: #292c34;
  color: #fff;
}

.admin-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

@media (max-width: 760px) {
  .admin-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .admin-nav {
    display: flex;
    overflow-x: auto;
  }
  .admin-nav button {
    width: auto;
    white-space: nowrap;
  }
  .admin-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .admin-analytics {
    grid-template-columns: minmax(0, 1fr);
  }
  .activity-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .chart-heading {
    display: block;
  }
  .chart-heading > div {
    margin-top: 8px;
  }
  .film-admin-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .film-detail-card {
    grid-template-columns: minmax(0, 1fr);
  }
  .film-detail-poster > * {
    width: 120px;
    min-height: 180px;
  }
  .film-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .admin-checkbox-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .admin-pagination {
    flex-wrap: wrap;
    justify-content: center;
    text-align: center;
  }
  .admin-pagination span {
    order: -1;
    width: 100%;
  }
}
</style>
