<script setup lang="ts">
import type { FeedbackRating, FeedbackType, SelectOption } from '~/types';
import type {
  AdminFilmStatus,
  ModerationAction,
} from '~/utils/admin-film-moderation';
import {
  appendModerationHistory,
  appendUniqueFilms,
  deferFilmForLater,
  getAdminFilmStatusQuery,
  getFilmStatusLabel,
  getNextFilmStatus,
  matchesAdminFilmStatus,
} from '~/utils/admin-film-moderation';
import {
  loadAllAdminReferences,
  resolveAdminReferenceNames,
  type AdminReferenceOption,
} from '~/utils/admin-references';
import {
  filmGroupAccents,
  filmGroupAccentStyles,
  filmGroupCategories,
  filmGroupCategoryLabels,
  filmGroupIcons,
  normalizeFilmGroup,
  type FilmGroupAccent,
  type FilmGroupCategory,
  type FilmGroupIcon,
} from '~/utils/film-groups';

definePageMeta({ middleware: 'admin' });

type Section =
  | 'dashboard'
  | 'films'
  | 'groups'
  | 'tags'
  | 'countries'
  | 'persons'
  | 'positions'
  | 'feedback';
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
  category?: FilmGroupCategory;
  icon?: FilmGroupIcon;
  accent?: FilmGroupAccent;
  created_at?: string;
};
type AdminReference = AdminReferenceOption;
type AdminFeedback = {
  _id: string;
  type: FeedbackType;
  rating?: FeedbackRating;
  message?: string;
  subject_id: string;
  subject_type: 'user' | 'guest';
  subject?: { _id: string; name?: string };
  room_id?: string;
  room?: { _id: string; code: string };
  page_path: string;
  user_agent?: string;
  created_at: string;
};
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
const filmStatus = ref<AdminFilmStatus>('pending');
const missing = ref('');
const groupId = ref('');
const selectedCountries = ref<SelectOption[]>([]);
const selectedTags = ref<SelectOption[]>([]);
const selectedPersons = ref<SelectOption[]>([]);
const availableCountryIds = ref<string[] | null>(null);
const availableTagIds = ref<string[] | null>(null);
const ratingFrom = ref<number | ''>('');
const ratingTo = ref<number | ''>('');
const yearFrom = ref<number | ''>('');
const yearTo = ref<number | ''>('');
const items = ref<AdminFilm[]>([]);
const groupOptions = ref<AdminReference[]>([]);
const tagOptions = ref<AdminReference[]>([]);
const countryOptions = ref<AdminReference[]>([]);
const personOptions = ref<AdminReference[]>([]);
const personOptionsStatus = ref<'error' | 'pending' | 'success' | 'idle'>(
  'idle',
);
const personOptionsOffset = ref(0);
const personOptionsTotal = ref(0);
const personSearch = ref('');
const total = ref(0);
const filmLimit = 40;
const serverOffset = ref(0);
const reachedEnd = ref(false);
const loadSentinel = ref<HTMLElement | null>(null);
const dashboard = ref<AdminDashboard | null>(null);
const feedbackItems = ref<AdminFeedback[]>([]);
const feedbackTotal = ref(0);
const feedbackOffset = ref(0);
const feedbackType = ref<FeedbackType | ''>('');
const feedbackRating = ref<FeedbackRating | ''>('');
const selectedFeedback = ref<AdminFeedback | null>(null);
const feedbackLimit = 30;
const selected = ref<AdminFilm | null>(null);
const selectedOriginal = ref<AdminFilm | null>(null);
const creatingReference = ref(false);
const filmDetails = ref<AdminFilm | null>(null);
const isFilmModalOpen = ref(false);
const filmModalMode = ref<'details' | 'edit'>('details');
const isFilmDetailsLoading = ref(false);
const moderationMode = ref(false);
const isModerationFullscreen = ref(false);
const deferredFilms = ref<AdminFilm[]>([]);
type SwipeAction =
  { type: 'moderation'; filmId: string } | { type: 'skip'; film: AdminFilm };
const swipeActions = ref<SwipeAction[]>([]);
const revisitRound = ref(0);
const pendingFilmIds = ref(new Set<string>());
type ModerationHistoryItem = {
  film: AdminFilm;
  index: number;
  before: Pick<AdminFilm, 'verified' | 'deleted'>;
  after: Pick<AdminFilm, 'verified' | 'deleted'>;
};
const moderationHistory = ref<ModerationHistoryItem[]>([]);
const error = ref('');
const isLoading = ref(false);
const wrappedFetch = useWrappedFetch();
let requestVersion = 0;
let personRequestVersion = 0;
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
] as const satisfies ReadonlyArray<keyof AdminFilm>;

const filmStatuses: Array<{ value: AdminFilmStatus; label: string }> = [
  { value: 'pending', label: 'На проверке' },
  { value: 'verified', label: 'В пуле' },
  { value: 'deleted', label: 'Скрытые' },
  { value: 'active', label: 'Все активные' },
];

const availableCountryOptions = computed(() => {
  const allowed = availableCountryIds.value
    ? new Set(availableCountryIds.value)
    : null;
  return countryOptions.value
    .filter(({ _id }) => !allowed || allowed.has(_id))
    .map(({ _id, name }) => ({ value: _id, label: name }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
});
const availableTagOptions = computed(() => {
  const allowed = availableTagIds.value ? new Set(availableTagIds.value) : null;
  return tagOptions.value
    .filter(({ _id }) => !allowed || allowed.has(_id))
    .map(({ _id, name }) => ({ value: _id, label: name }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
});

const labels: Record<Section, string> = {
  dashboard: 'Дашборд',
  films: 'Фильмы',
  groups: 'Подборки',
  tags: 'Жанры',
  countries: 'Страны',
  persons: 'Персоны',
  positions: 'Профессии',
  feedback: 'Обратная связь',
};
const sections: Section[] = [
  'dashboard',
  'films',
  'groups',
  'tags',
  'countries',
  'persons',
  'positions',
  'feedback',
];

const feedbackTypeLabels: Record<FeedbackType, string> = {
  room_experience: 'После комнаты',
  bug_report: 'Ошибка',
};
const feedbackRatingLabels: Record<FeedbackRating, string> = {
  negative: 'Не очень',
  neutral: 'Нормально',
  positive: 'Отлично',
};
const presentFilmGroup = (film: AdminFilm) =>
  normalizeFilmGroup({
    _id: film._id,
    name: film.name || '',
    name_en: film.name_en,
    description: film.description,
    category: film.category,
    icon: film.icon,
    accent: film.accent,
  });
const selectedFilmGroupPreview = computed(() => {
  if (section.value !== 'groups' || !selected.value) return null;
  return normalizeFilmGroup({
    _id: selected.value._id,
    name: selected.value.name || 'Название подборки',
    name_en: selected.value.name_en,
    description: selected.value.description,
    category: selected.value.category,
    icon: selected.value.icon,
    accent: selected.value.accent,
  });
});

const formatFeedbackDate = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const feedbackAuthor = (item: AdminFeedback) =>
  item.subject?.name ||
  (item.subject_type === 'guest' ? 'Гость' : 'Пользователь');

const loadFilmOptions = async () => {
  const loadReferences = (resource: 'groups' | 'tags' | 'countries') =>
    loadAllAdminReferences<AdminReference>(async ({ limit, offset }) =>
      wrappedFetch(
        `/admin/${resource}?${new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
        })}`,
      ),
    );
  const [groups, tags, countries] = await Promise.all([
    loadReferences('groups'),
    loadReferences('tags'),
    loadReferences('countries'),
  ]);
  groupOptions.value = groups;
  tagOptions.value = tags;
  countryOptions.value = countries;
};

const loadPersonOptions = async (reset = false) => {
  if (
    (!reset && personOptionsStatus.value === 'pending') ||
    (!reset && personOptionsOffset.value >= personOptionsTotal.value)
  )
    return;
  const version = reset ? ++personRequestVersion : personRequestVersion;
  if (reset) {
    personOptions.value = [];
    personOptionsOffset.value = 0;
    personOptionsTotal.value = 0;
  }
  personOptionsStatus.value = 'pending';
  try {
    const params = new URLSearchParams({
      limit: '100',
      offset: String(personOptionsOffset.value),
    });
    if (personSearch.value) params.set('search', personSearch.value);
    const response = await wrappedFetch<{
      items: AdminReference[];
      meta: { total: number };
    }>(`/admin/persons?${params}`);
    if (version !== personRequestVersion) return;
    const known = new Set(personOptions.value.map(({ _id }) => _id));
    personOptions.value = [
      ...personOptions.value,
      ...response.items.filter(({ _id }) => !known.has(_id)),
    ];
    personOptionsOffset.value += response.items.length;
    personOptionsTotal.value = response.meta.total;
    personOptionsStatus.value = 'success';
  } catch {
    if (version === personRequestVersion) personOptionsStatus.value = 'error';
  }
};

const searchablePersonOptions = computed(() =>
  personOptions.value.map(({ _id, name }) => ({ value: _id, label: name })),
);

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
const canLoadMore = computed(
  () => !reachedEnd.value && serverOffset.value < total.value,
);
const currentSwipeFilm = computed(() => items.value[0] ?? null);
const nextSwipeFilm = computed(() => items.value[1] ?? null);
const swipeRemaining = computed(
  () =>
    items.value.length +
    deferredFilms.value.length +
    Math.max(0, total.value - serverOffset.value),
);
const canUndoSwipe = computed(() => {
  return Boolean(swipeActions.value.length);
});
const swipeFilm = (film: AdminFilm) => ({
  ...film,
  countryNames: resolveAdminReferenceNames(
    film.countries,
    countryOptions.value,
    'Неизвестная страна',
  ),
  tagNames: resolveAdminReferenceNames(
    film.tags,
    tagOptions.value,
    'Неизвестный жанр',
  ),
});

const exitModerationFullscreen = () => {
  isModerationFullscreen.value = false;
};
const handlePageKeydown = (event: KeyboardEvent) => {
  const target = event.target;
  const isFormControl =
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable);
  if (event.key === 'Escape' && isModerationFullscreen.value) {
    event.preventDefault();
    exitModerationFullscreen();
  } else if (
    event.key === 'ArrowUp' &&
    section.value === 'films' &&
    moderationMode.value &&
    !isFilmModalOpen.value &&
    !isFormControl &&
    canUndoSwipe.value &&
    !pendingFilmIds.value.size
  ) {
    event.preventDefault();
    void undoSwipeModeration();
  }
};

const setPending = (id: string, pending: boolean) => {
  const next = new Set(pendingFilmIds.value);
  if (pending) next.add(id);
  else next.delete(id);
  pendingFilmIds.value = next;
};

const isFilmPending = (id: string) => pendingFilmIds.value.has(id);

const updatePaginationForTransition = (
  before: Pick<AdminFilm, 'verified' | 'deleted'>,
  after: Pick<AdminFilm, 'verified' | 'deleted'>,
) => {
  const beforeMatches = matchesAdminFilmStatus(before, filmStatus.value);
  const afterMatches = matchesAdminFilmStatus(after, filmStatus.value);
  if (beforeMatches === afterMatches) return;
  const delta = afterMatches ? 1 : -1;
  serverOffset.value = Math.max(0, serverOffset.value + delta);
  total.value = Math.max(0, total.value + delta);
};

async function loadFilms(reset = false) {
  if (
    !reset &&
    (isLoading.value || pendingFilmIds.value.size > 0 || !canLoadMore.value)
  )
    return;
  const version = reset ? ++requestVersion : requestVersion;
  if (reset) {
    items.value = [];
    deferredFilms.value = [];
    swipeActions.value = [];
    revisitRound.value = 0;
    total.value = 0;
    serverOffset.value = 0;
    reachedEnd.value = false;
  }
  isLoading.value = true;
  error.value = '';
  try {
    if (reset) await loadFilmOptions();
    const params = new URLSearchParams({
      limit: String(filmLimit),
      offset: String(serverOffset.value),
    });
    Object.entries(getAdminFilmStatusQuery(filmStatus.value)).forEach(
      ([key, value]) => params.set(key, value),
    );
    if (search.value) params.set('search', search.value);
    if (missing.value) params.set('missing', missing.value);
    if (groupId.value) params.set('group_id', groupId.value);
    if (selectedCountries.value.length)
      params.set(
        'countries',
        selectedCountries.value.map(({ value }) => value).join(','),
      );
    if (selectedTags.value.length)
      params.set(
        'tags',
        selectedTags.value.map(({ value }) => value).join(','),
      );
    if (ratingFrom.value !== '')
      params.set('rating_from', String(ratingFrom.value));
    if (ratingTo.value !== '') params.set('rating_to', String(ratingTo.value));
    if (yearFrom.value !== '') params.set('year_from', String(yearFrom.value));
    if (yearTo.value !== '') params.set('year_to', String(yearTo.value));
    if (selectedPersons.value.length)
      params.set(
        'persons',
        selectedPersons.value.map(({ value }) => value).join(','),
      );
    const filterOptionParams = new URLSearchParams(params);
    filterOptionParams.delete('limit');
    filterOptionParams.delete('offset');
    const [response, filterOptions] = await Promise.all([
      wrappedFetch<{
        items: AdminFilm[];
        meta: { total: number };
      }>(`/admin/films?${params}`),
      reset
        ? wrappedFetch<{ country_ids: string[]; tag_ids: string[] }>(
            `/admin/films/filter-options?${filterOptionParams}`,
          )
        : Promise.resolve(null),
    ]);
    if (version !== requestVersion) return;
    if (filterOptions) {
      availableCountryIds.value = filterOptions.country_ids;
      availableTagIds.value = filterOptions.tag_ids;
    }
    items.value = appendUniqueFilms(items.value, response.items);
    serverOffset.value += response.items.length;
    total.value = response.meta.total;
    reachedEnd.value =
      response.items.length < filmLimit || serverOffset.value >= total.value;
  } catch {
    if (version === requestVersion)
      error.value = 'Не удалось загрузить фильмы.';
  } finally {
    if (version === requestVersion) isLoading.value = false;
  }
}

async function refresh() {
  error.value = '';
  isLoading.value = true;
  try {
    if (section.value === 'dashboard') {
      dashboard.value = await wrappedFetch<AdminDashboard>('/admin/dashboard');
      return;
    }
    if (section.value === 'films') {
      await loadFilms(true);
      return;
    }
    if (section.value === 'feedback') {
      await loadFeedback(true);
      return;
    }
    const params = new URLSearchParams();
    if (search.value) params.set('search', search.value);
    params.set('limit', '100');
    params.set('offset', '0');
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
  filmStatus.value = 'pending';
  missing.value = '';
  groupId.value = '';
  selectedCountries.value = [];
  selectedTags.value = [];
  selectedPersons.value = [];
  availableCountryIds.value = null;
  availableTagIds.value = null;
  ratingFrom.value = '';
  ratingTo.value = '';
  yearFrom.value = '';
  yearTo.value = '';
  moderationMode.value = false;
  feedbackType.value = '';
  feedbackRating.value = '';
  selectedFeedback.value = null;
  selected.value = null;
  selectedOriginal.value = null;
  closeFilmModal();
  await refresh();
}

async function loadFeedback(reset = false) {
  if (isLoading.value && !reset) return;
  if (reset) {
    feedbackItems.value = [];
    feedbackOffset.value = 0;
    feedbackTotal.value = 0;
  }
  isLoading.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams({
      limit: String(feedbackLimit),
      offset: String(feedbackOffset.value),
    });
    if (feedbackType.value) params.set('type', feedbackType.value);
    if (feedbackRating.value) params.set('rating', feedbackRating.value);
    const response = await wrappedFetch<{
      items: AdminFeedback[];
      meta: { total: number };
    }>(`/admin/feedback?${params}`);
    const knownIds = new Set(feedbackItems.value.map(({ _id }) => _id));
    feedbackItems.value.push(
      ...response.items.filter(({ _id }) => !knownIds.has(_id)),
    );
    feedbackOffset.value += response.items.length;
    feedbackTotal.value = response.meta.total;
  } catch {
    error.value = 'Не удалось загрузить обратную связь.';
  } finally {
    isLoading.value = false;
  }
}

const applyFeedbackFilters = () => loadFeedback(true);

async function openFilm(film: AdminFilm, edit = false) {
  error.value = '';
  filmDetails.value = null;
  selected.value = null;
  selectedOriginal.value = null;
  filmModalMode.value = 'details';
  isFilmModalOpen.value = true;
  isFilmDetailsLoading.value = true;
  try {
    filmDetails.value = await wrappedFetch<AdminFilm>(
      `/admin/films/${film._id}`,
    );
    if (edit) beginEdit(filmDetails.value);
  } catch {
    error.value = 'Не удалось открыть карточку фильма.';
    isFilmModalOpen.value = false;
  } finally {
    isFilmDetailsLoading.value = false;
  }
}

function closeFilmModal() {
  isFilmModalOpen.value = false;
  filmDetails.value = null;
  if (section.value === 'films') {
    selected.value = null;
    selectedOriginal.value = null;
  }
}

async function moderate(film: AdminFilm, action: ModerationAction) {
  if (isFilmPending(film._id)) return;
  const before = { verified: film.verified, deleted: film.deleted };
  const after = getNextFilmStatus(film, action);
  const index = items.value.findIndex(({ _id }) => _id === film._id);
  const originalFilm = JSON.parse(JSON.stringify(film)) as AdminFilm;
  setPending(film._id, true);
  if (index >= 0) items.value.splice(index, 1);
  updatePaginationForTransition(before, after);
  try {
    if (action === 'verify') {
      await wrappedFetch(`/admin/films/${film._id}/verify`, {
        method: 'PATCH',
      });
    } else if (action === 'hide') {
      await wrappedFetch(`/admin/films/${film._id}`, { method: 'DELETE' });
    } else {
      await wrappedFetch(`/admin/films/${film._id}`, {
        method: 'PATCH',
        body: after,
      });
    }
    moderationHistory.value = appendModerationHistory(moderationHistory.value, {
      film: originalFilm,
      index: Math.max(0, index),
      before,
      after,
    });
    if (
      moderationMode.value &&
      !before.verified &&
      !before.deleted &&
      (action === 'verify' || action === 'hide')
    ) {
      swipeActions.value.push({ type: 'moderation', filmId: film._id });
    }
    if (filmDetails.value?._id === film._id) closeFilmModal();
  } catch {
    updatePaginationForTransition(after, before);
    if (index >= 0) items.value.splice(index, 0, originalFilm);
    error.value = 'Не удалось изменить статус фильма. Изменение отменено.';
  } finally {
    setPending(film._id, false);
  }
}

async function undoLastModeration() {
  const historyItem = moderationHistory.value.at(-1);
  if (!historyItem || isFilmPending(historyItem.film._id)) return false;
  setPending(historyItem.film._id, true);
  error.value = '';
  try {
    await wrappedFetch(`/admin/films/${historyItem.film._id}`, {
      method: 'PATCH',
      body: historyItem.before,
    });
    updatePaginationForTransition(historyItem.after, historyItem.before);
    if (
      matchesAdminFilmStatus(historyItem.before, filmStatus.value) &&
      !items.value.some(({ _id }) => _id === historyItem.film._id)
    ) {
      items.value.splice(
        Math.min(historyItem.index, items.value.length),
        0,
        historyItem.film,
      );
    }
    moderationHistory.value.pop();
    return true;
  } catch {
    error.value = 'Не удалось отменить последнее действие.';
    return false;
  } finally {
    setPending(historyItem.film._id, false);
  }
}

async function undoSwipeModeration() {
  if (!canUndoSwipe.value || pendingFilmIds.value.size) return;
  const action = swipeActions.value.at(-1);
  if (!action) return;
  if (action.type === 'skip') {
    items.value = items.value.filter(({ _id }) => _id !== action.film._id);
    deferredFilms.value = deferredFilms.value.filter(
      ({ _id }) => _id !== action.film._id,
    );
    items.value.unshift(action.film);
    swipeActions.value.pop();
    return;
  }
  const historyItem = moderationHistory.value.at(-1);
  if (historyItem?.film._id !== action.filmId) return;
  if (await undoLastModeration()) swipeActions.value.pop();
}

async function ensureSwipeQueue() {
  if (!moderationMode.value) return;
  if (items.value.length <= 4 && canLoadMore.value && !isLoading.value)
    await loadFilms(false);
  if (
    !items.value.length &&
    !canLoadMore.value &&
    !isLoading.value &&
    deferredFilms.value.length
  ) {
    items.value = deferredFilms.value;
    deferredFilms.value = [];
    revisitRound.value += 1;
  }
}

async function skipSwipeFilm(film: AdminFilm) {
  if (isFilmPending(film._id)) return;
  const deferred = deferFilmForLater(
    items.value,
    deferredFilms.value,
    film._id,
  );
  items.value = deferred.active;
  deferredFilms.value = deferred.deferred;
  swipeActions.value.push({ type: 'skip', film });
  await ensureSwipeQueue();
}

async function handleSwipeDecision(
  film: AdminFilm,
  action: Extract<ModerationAction, 'verify' | 'hide'>,
) {
  await moderate(film, action);
  await ensureSwipeQueue();
}

function beginEdit(film: AdminFilm) {
  const presentation =
    section.value === 'groups'
      ? normalizeFilmGroup({
          _id: film._id,
          name: film.name || '',
          name_en: film.name_en,
          description: film.description,
          category: film.category,
          icon: film.icon,
          accent: film.accent,
        })
      : null;
  const copy = JSON.parse(
    JSON.stringify({
      ...film,
      ...(presentation
        ? {
            category: presentation.category,
            icon: presentation.icon,
            accent: presentation.accent,
          }
        : {}),
      countries: film.countries ?? [],
      tags: film.tags ?? [],
      groups: film.groups ?? [],
    }),
  ) as AdminFilm;
  selected.value = copy;
  selectedOriginal.value = JSON.parse(JSON.stringify(copy)) as AdminFilm;
  creatingReference.value = false;
  if (section.value === 'films') filmModalMode.value = 'edit';
}

async function save() {
  if (!selected.value) return;
  const resource = section.value === 'films' ? 'films' : section.value;
  if (creatingReference.value && section.value === 'groups') {
    await wrappedFetch('/admin/groups', {
      method: 'POST',
      body: {
        name: selected.value.name,
        name_en: selected.value.name_en || undefined,
        description: selected.value.description || undefined,
        category: selected.value.category,
        icon: selected.value.icon,
        accent: selected.value.accent,
        verified: selected.value.verified,
      },
    });
    selected.value = null;
    selectedOriginal.value = null;
    creatingReference.value = false;
    await refresh();
    return;
  }
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
  const savedId = selected.value._id;
  const savedValues = JSON.parse(JSON.stringify(selected.value)) as AdminFilm;
  const itemIndex = items.value.findIndex(({ _id }) => _id === savedId);
  if (itemIndex >= 0)
    items.value[itemIndex] = { ...items.value[itemIndex], ...savedValues };
  if (section.value === 'films') {
    filmDetails.value = {
      ...(filmDetails.value ?? savedValues),
      ...savedValues,
    };
    filmModalMode.value = 'details';
  }
  selected.value = null;
  selectedOriginal.value = null;
  creatingReference.value = false;
  if (section.value !== 'films') await refresh();
}

async function applyFilters() {
  moderationMode.value = filmStatus.value === 'pending' && moderationMode.value;
  if (section.value === 'films') await loadFilms(true);
  else await refresh();
}

async function updateCountryFilters(options: SelectOption[]) {
  selectedCountries.value = options;
  await applyFilters();
}

async function updateTagFilters(options: SelectOption[]) {
  selectedTags.value = options;
  await applyFilters();
}

async function updatePersonFilters(options: SelectOption[]) {
  selectedPersons.value = options;
  await applyFilters();
}

const handleSearchPersons = (value: string) => {
  personSearch.value = value.trim();
  void loadPersonOptions(true);
};

async function remove(item: Pick<AdminFilm, '_id' | 'name'>) {
  if (!confirm(`Скрыть «${item.name}»?`)) return;
  const resource = section.value === 'films' ? 'films' : section.value;
  await wrappedFetch(`/admin/${resource}/${item._id}`, { method: 'DELETE' });
  await refresh();
}

async function createReference() {
  if (section.value === 'groups') {
    selected.value = {
      _id: '',
      name: '',
      name_en: '',
      description: '',
      verified: false,
      deleted: false,
      category: 'other',
      icon: 'layers-3',
      accent: 'amber',
    };
    selectedOriginal.value = null;
    creatingReference.value = true;
    return;
  }
  const name = prompt('Название новой записи');
  if (!name || section.value === 'dashboard' || section.value === 'films')
    return;
  await wrappedFetch(`/admin/${section.value}`, {
    method: 'POST',
    body: { name },
  });
  await refresh();
}

useIntersectionObserver(
  loadSentinel,
  ([entry]) => {
    if (entry?.isIntersecting && section.value === 'films')
      void loadFilms(false);
  },
  { rootMargin: '320px' },
);

watch(filmStatus, () => {
  if (filmStatus.value !== 'pending') moderationMode.value = false;
});

watch(moderationMode, (enabled) => {
  if (enabled) {
    swipeActions.value = [];
    void ensureSwipeQueue();
    return;
  }
  swipeActions.value = [];
  isModerationFullscreen.value = false;
  if (deferredFilms.value.length) {
    items.value = appendUniqueFilms(items.value, deferredFilms.value);
    deferredFilms.value = [];
  }
  revisitRound.value = 0;
});

watch(isFilmModalOpen, (isOpen) => {
  if (isOpen) return;
  filmDetails.value = null;
  if (section.value === 'films') {
    selected.value = null;
    selectedOriginal.value = null;
  }
  filmModalMode.value = 'details';
});

onMounted(() => {
  document.addEventListener('keydown', handlePageKeydown);
  void loadPersonOptions(true);
  void refresh();
});
onBeforeUnmount(() =>
  document.removeEventListener('keydown', handlePageKeydown),
);
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

        <template v-else-if="section === 'feedback'">
          <div
            class="mb-5 grid gap-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,13rem)_auto]"
          >
            <select
              v-model="feedbackType"
              class="admin-filter-control"
              aria-label="Тип обратной связи"
              @change="applyFeedbackFilters"
            >
              <option value="">Все обращения</option>
              <option value="room_experience">После комнаты</option>
              <option value="bug_report">Ошибки</option>
            </select>
            <select
              v-model="feedbackRating"
              class="admin-filter-control"
              aria-label="Оценка комнаты"
              @change="applyFeedbackFilters"
            >
              <option value="">Любая оценка</option>
              <option value="negative">Не очень</option>
              <option value="neutral">Нормально</option>
              <option value="positive">Отлично</option>
            </select>
            <span class="self-center text-sm text-zinc-500">
              {{ feedbackTotal }} обращений
            </span>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <button
              v-for="item in feedbackItems"
              :key="item._id"
              type="button"
              class="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 text-left transition hover:border-white/20"
              @click="selectedFeedback = item"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex flex-wrap gap-2">
                  <span
                    class="rounded-full px-2.5 py-1 text-xs"
                    :class="
                      item.type === 'bug_report'
                        ? 'bg-red-400/10 text-red-200'
                        : 'bg-amber-300/10 text-amber-200'
                    "
                  >
                    {{ feedbackTypeLabels[item.type] }}
                  </span>
                  <span
                    v-if="item.rating"
                    class="rounded-full bg-white/5 px-2.5 py-1 text-xs text-zinc-300"
                  >
                    {{ feedbackRatingLabels[item.rating] }}
                  </span>
                </div>
                <time class="shrink-0 text-xs text-zinc-600">
                  {{ formatFeedbackDate(item.created_at) }}
                </time>
              </div>
              <p
                class="mt-4 line-clamp-3 min-h-10 text-sm leading-5 text-zinc-300"
              >
                {{ item.message || 'Комментарий не оставлен.' }}
              </p>
              <div
                class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500"
              >
                <span>{{ feedbackAuthor(item) }}</span>
                <span v-if="item.room">Комната {{ item.room.code }}</span>
                <span v-else-if="item.room_id">Комната {{ item.room_id }}</span>
              </div>
            </button>
          </div>
          <p
            v-if="!isLoading && !feedbackItems.length"
            class="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500"
          >
            По выбранным фильтрам обращений нет.
          </p>
          <div class="mt-5 text-center">
            <p v-if="isLoading" class="text-sm text-zinc-500">Загрузка…</p>
            <button
              v-else-if="feedbackOffset < feedbackTotal"
              type="button"
              class="min-h-11 rounded-xl border border-white/15 px-5 text-sm text-white hover:bg-white/5"
              @click="loadFeedback(false)"
            >
              Показать ещё
            </button>
          </div>
        </template>

        <template v-else-if="selected && !isFilmModalOpen">
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
            <template v-if="section === 'groups' && selectedFilmGroupPreview">
              <label class="block text-sm text-zinc-300">
                Описание
                <textarea
                  v-model="selected.description"
                  rows="3"
                  class="admin-input"
                  placeholder="Коротко объясните, какие фильмы входят в подборку"
                />
              </label>
              <div class="grid gap-4 sm:grid-cols-3">
                <label class="block text-sm text-zinc-300">
                  Категория
                  <select v-model="selected.category" class="admin-input">
                    <option
                      v-for="category in filmGroupCategories"
                      :key="category"
                      :value="category"
                    >
                      {{ filmGroupCategoryLabels[category] }}
                    </option>
                  </select>
                </label>
                <label class="block text-sm text-zinc-300">
                  Иконка
                  <select v-model="selected.icon" class="admin-input">
                    <option
                      v-for="iconName in filmGroupIcons"
                      :key="iconName"
                      :value="iconName"
                    >
                      {{ iconName }}
                    </option>
                  </select>
                </label>
                <label class="block text-sm text-zinc-300">
                  Цвет
                  <select v-model="selected.accent" class="admin-input">
                    <option
                      v-for="accentName in filmGroupAccents"
                      :key="accentName"
                      :value="accentName"
                    >
                      {{ accentName }}
                    </option>
                  </select>
                </label>
              </div>
              <div>
                <p class="mb-2 text-xs uppercase tracking-wider text-zinc-500">
                  Предпросмотр
                </p>
                <div
                  class="max-w-xs rounded-2xl border p-4"
                  :class="
                    filmGroupAccentStyles[selectedFilmGroupPreview.accent].card
                  "
                >
                  <span
                    class="grid size-10 place-items-center rounded-xl"
                    :class="
                      filmGroupAccentStyles[selectedFilmGroupPreview.accent]
                        .icon
                    "
                  >
                    <icon
                      :name="`lucide:${selectedFilmGroupPreview.icon}`"
                      class="size-5"
                    />
                  </span>
                  <p class="mt-3 text-sm font-medium text-white">
                    {{ selectedFilmGroupPreview.name }}
                  </p>
                  <p
                    v-if="selectedFilmGroupPreview.description"
                    class="mt-1 text-xs leading-4 text-zinc-300"
                  >
                    {{ selectedFilmGroupPreview.description }}
                  </p>
                  <p class="mt-1 text-xs text-zinc-400">
                    {{
                      filmGroupCategoryLabels[selectedFilmGroupPreview.category]
                    }}
                  </p>
                </div>
              </div>
            </template>
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
                :disabled="!selected.name?.trim()"
                @click="save"
              >
                Сохранить</button
              ><button
                class="rounded-xl bg-white/10 px-4 py-2 text-sm text-white"
                @click="
                  selected = null;
                  selectedOriginal = null;
                  creatingReference = false;
                "
              >
                Отмена
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <div v-if="section === 'films'" class="moderation-toolbar">
            <div class="film-status-tabs" aria-label="Статус фильмов">
              <button
                v-for="status in filmStatuses"
                :key="status.value"
                type="button"
                :class="{ 'is-active': filmStatus === status.value }"
                @click="
                  filmStatus = status.value;
                  applyFilters();
                "
              >
                {{ status.label }}
              </button>
            </div>
            <label v-if="filmStatus === 'pending'" class="moderation-toggle">
              <input v-model="moderationMode" type="checkbox" />
              <span>Поточная модерация</span>
            </label>
            <p v-if="moderationMode" class="moderation-legend">
              Свайп или <strong>←</strong> — скрыть, свайп или
              <strong>→</strong> — в пул, <strong>↓ / S</strong> — отложить до
              следующего прохода, <strong>↑</strong> — вернуть предыдущий фильм.
            </p>
            <div class="moderation-summary">
              <span>{{ total }} фильмов</span>
              <button
                v-if="moderationMode ? canUndoSwipe : moderationHistory.length"
                type="button"
                :disabled="pendingFilmIds.size > 0"
                @click="
                  moderationMode ? undoSwipeModeration() : undoLastModeration()
                "
              >
                <template v-if="moderationMode">
                  ↑ Вернуть предыдущий ({{ swipeActions.length }})
                </template>
                <template v-else>
                  ↶ Отменить последнее ({{ moderationHistory.length }})
                </template>
              </button>
            </div>
          </div>
          <div class="admin-filters mb-4">
            <input
              v-model="search"
              placeholder="Поиск"
              class="admin-filter-control"
              @keyup.enter="applyFilters"
            /><select
              v-if="section === 'films'"
              v-model="missing"
              class="admin-filter-control"
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
              class="admin-filter-control"
              @change="applyFilters"
            >
              <option value="">Все подборки</option>
              <option
                v-for="group in groupOptions"
                :key="group._id"
                :value="group._id"
              >
                {{ group.name }}
              </option>
            </select>
            <div v-if="section === 'films'" class="admin-reference-filter">
              <span>Страны · {{ availableCountryOptions.length }}</span>
              <design-system-multiselect
                aria-label="Выбрать страны"
                :options="availableCountryOptions"
                :selected-options="selectedCountries"
                @update:selected-options="updateCountryFilters"
              />
            </div>
            <div v-if="section === 'films'" class="admin-reference-filter">
              <span>Жанры · {{ availableTagOptions.length }}</span>
              <design-system-multiselect
                aria-label="Выбрать жанры"
                :options="availableTagOptions"
                :selected-options="selectedTags"
                @update:selected-options="updateTagFilters"
              />
            </div>
            <div v-if="section === 'films'" class="admin-reference-filter">
              <span>Персоны</span>
              <design-system-multiselect
                aria-label="Выбрать персон"
                :is-api="true"
                :options="searchablePersonOptions"
                :selected-options="selectedPersons"
                :status="personOptionsStatus"
                @update:selected-options="updatePersonFilters"
                @search="handleSearchPersons"
                @load-more="loadPersonOptions()"
              />
            </div>
            <div v-if="section === 'films'" class="admin-rating-range">
              <label class="admin-rating-filter">
                <span>Рейтинг от</span>
                <input
                  v-model.number="ratingFrom"
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  inputmode="decimal"
                  class="admin-filter-control"
                  @keyup.enter="applyFilters"
                />
              </label>
              <label class="admin-rating-filter">
                <span>до</span>
                <input
                  v-model.number="ratingTo"
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  inputmode="decimal"
                  class="admin-filter-control"
                  @keyup.enter="applyFilters"
                />
              </label>
            </div>
            <div v-if="section === 'films'" class="admin-rating-range">
              <label class="admin-rating-filter">
                <span>Год от</span>
                <input
                  v-model.number="yearFrom"
                  type="number"
                  min="1937"
                  :max="new Date().getFullYear()"
                  step="1"
                  inputmode="numeric"
                  class="admin-filter-control"
                  @keyup.enter="applyFilters"
                />
              </label>
              <label class="admin-rating-filter">
                <span>до</span>
                <input
                  v-model.number="yearTo"
                  type="number"
                  min="1937"
                  :max="new Date().getFullYear()"
                  step="1"
                  inputmode="numeric"
                  class="admin-filter-control"
                  @keyup.enter="applyFilters"
                />
              </label>
            </div>
            <button class="admin-filter-button" @click="applyFilters">
              Найти</button
            ><button
              v-if="section !== 'films'"
              class="rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950"
              @click="createReference"
            >
              Добавить</button
            ><span class="admin-filter-total text-zinc-500"
              >{{ total }} записей</span
            >
          </div>
          <section
            v-if="section === 'films' && moderationMode"
            class="admin-swipe-workspace"
            :class="{ 'is-fullscreen': isModerationFullscreen }"
          >
            <header class="admin-swipe-header">
              <div>
                <strong>Модерация фильмов</strong>
                <div class="admin-swipe-progress">
                  <span>Осталось в проходе: {{ swipeRemaining }}</span>
                  <span v-if="deferredFilms.length"
                    >Отложено: {{ deferredFilms.length }}</span
                  >
                  <span v-if="revisitRound">Повторный проход</span>
                </div>
              </div>
              <button
                type="button"
                class="admin-fullscreen-button"
                @click="isModerationFullscreen = !isModerationFullscreen"
              >
                {{
                  isModerationFullscreen ? 'Свернуть (Esc)' : 'На весь экран'
                }}
              </button>
            </header>
            <div class="admin-swipe-hints">
              <span><b>←</b> скрыть</span>
              <span><b>↑</b> вернуть предыдущий</span>
              <span><b>↓ / S</b> отложить</span>
              <span><b>→</b> в пул</span>
            </div>
            <div v-if="currentSwipeFilm" class="admin-swipe-stack">
              <div v-if="nextSwipeFilm" class="admin-swipe-card-back">
                <film-poster
                  :src="nextSwipeFilm.poster_url"
                  :alt="nextSwipeFilm.name || 'Следующий фильм'"
                  class="h-full w-full"
                />
              </div>
              <admin-moderation-swipe-card
                :key="currentSwipeFilm._id"
                :film="swipeFilm(currentSwipeFilm)"
                :missing-fields="missingFields(currentSwipeFilm)"
                :busy="pendingFilmIds.size > 0"
                :can-undo="canUndoSwipe"
                @decide="handleSwipeDecision(currentSwipeFilm, $event)"
                @skip="skipSwipeFilm(currentSwipeFilm)"
                @undo="undoSwipeModeration"
                @details="openFilm(currentSwipeFilm)"
              />
            </div>
            <div v-else class="admin-swipe-empty">
              <p v-if="isLoading">Загружаем следующую карточку…</p>
              <p v-else>Все фильмы в этой очереди обработаны.</p>
              <button
                v-if="canUndoSwipe"
                type="button"
                :disabled="pendingFilmIds.size > 0"
                @click="undoSwipeModeration"
              >
                ↑ Вернуть предыдущий фильм
              </button>
            </div>
          </section>
          <div v-else-if="section === 'films'" class="film-admin-grid">
            <article
              v-for="item in items"
              :key="item._id"
              class="film-admin-card"
              :class="{
                'is-pending-request': isFilmPending(item._id),
              }"
            >
              <button
                type="button"
                class="film-info-button"
                :aria-label="`Открыть подробности: ${item.name || 'фильм без названия'}`"
                @click.stop="openFilm(item)"
                @contextmenu.stop
              >
                i
              </button>
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
                    :class="{
                      'is-verified': item.verified && !item.deleted,
                      'is-pending': !item.verified && !item.deleted,
                      'is-deleted': item.deleted,
                    }"
                    >{{ getFilmStatusLabel(item) }}</span
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
                <div
                  class="film-card-actions mt-4 flex flex-wrap gap-2"
                  @click.stop
                  @contextmenu.stop
                >
                  <button
                    v-if="item.deleted"
                    :disabled="isFilmPending(item._id)"
                    class="film-card-action is-primary"
                    @click="moderate(item, 'restore')"
                  >
                    Восстановить</button
                  ><button
                    v-else-if="!item.verified"
                    :disabled="isFilmPending(item._id)"
                    class="film-card-action is-primary"
                    @click="moderate(item, 'verify')"
                  >
                    В пул</button
                  ><button
                    v-else
                    :disabled="isFilmPending(item._id)"
                    class="film-card-action"
                    @click="moderate(item, 'unverify')"
                  >
                    На проверку</button
                  ><button
                    class="film-card-action"
                    @click="openFilm(item, true)"
                  >
                    Изменить</button
                  ><button
                    v-if="!item.deleted"
                    :disabled="isFilmPending(item._id)"
                    class="film-card-action is-danger"
                    @click="moderate(item, 'hide')"
                  >
                    Скрыть
                  </button>
                </div>
              </div>
            </article>
            <p v-if="!isLoading && !items.length" class="empty-film-list">
              В этой очереди пока нет фильмов.
            </p>
          </div>
          <div
            v-if="section === 'films' && !moderationMode"
            ref="loadSentinel"
            class="load-more"
          >
            <p v-if="isLoading">Загрузка фильмов…</p>
            <button
              v-else-if="canLoadMore"
              type="button"
              @click="loadFilms(false)"
            >
              Показать ещё
            </button>
            <p v-else-if="items.length">Все фильмы в этой очереди загружены.</p>
          </div>
          <div
            v-if="section !== 'films'"
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
                    <div class="flex min-w-0 items-center gap-3">
                      <span
                        v-if="section === 'groups'"
                        class="grid size-9 shrink-0 place-items-center rounded-xl"
                        :class="
                          filmGroupAccentStyles[presentFilmGroup(item).accent]
                            .icon
                        "
                      >
                        <icon
                          :name="`lucide:${presentFilmGroup(item).icon}`"
                          class="size-4"
                        />
                      </span>
                      <div class="min-w-0">
                        <p class="truncate font-medium text-white">
                          {{ item.name }}
                        </p>
                        <p class="truncate text-xs text-zinc-500">
                          {{ item.name_en }}
                          <template v-if="section === 'groups'">
                            ·
                            {{
                              filmGroupCategoryLabels[
                                presentFilmGroup(item).category
                              ]
                            }}
                          </template>
                        </p>
                      </div>
                    </div>
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
    <design-system-modal
      :is-open="Boolean(selectedFeedback)"
      title="Обратная связь"
      @update:is-open="
        (open) => {
          if (!open) selectedFeedback = null;
        }
      "
    >
      <article v-if="selectedFeedback" class="space-y-5">
        <div class="flex flex-wrap gap-2">
          <span class="rounded-full bg-white/5 px-3 py-1 text-sm text-zinc-300">
            {{ feedbackTypeLabels[selectedFeedback.type] }}
          </span>
          <span
            v-if="selectedFeedback.rating"
            class="rounded-full bg-amber-300/10 px-3 py-1 text-sm text-amber-200"
          >
            {{ feedbackRatingLabels[selectedFeedback.rating] }}
          </span>
        </div>
        <p class="whitespace-pre-wrap text-sm leading-6 text-zinc-200">
          {{ selectedFeedback.message || 'Комментарий не оставлен.' }}
        </p>
        <dl
          class="grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm sm:grid-cols-2"
        >
          <div>
            <dt class="text-xs uppercase tracking-wide text-zinc-600">Дата</dt>
            <dd class="mt-1 text-zinc-300">
              {{ formatFeedbackDate(selectedFeedback.created_at) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-zinc-600">Автор</dt>
            <dd class="mt-1 break-all text-zinc-300">
              {{ feedbackAuthor(selectedFeedback) }} ·
              {{ selectedFeedback.subject_type }} ·
              {{ selectedFeedback.subject_id }}
            </dd>
          </div>
          <div v-if="selectedFeedback.room_id">
            <dt class="text-xs uppercase tracking-wide text-zinc-600">
              Комната
            </dt>
            <dd class="mt-1 break-all text-zinc-300">
              {{ selectedFeedback.room?.code || 'Код недоступен' }} ·
              {{ selectedFeedback.room_id }}
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-zinc-600">
              Страница
            </dt>
            <dd class="mt-1 break-all text-zinc-300">
              {{ selectedFeedback.page_path }}
            </dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs uppercase tracking-wide text-zinc-600">
              User-Agent
            </dt>
            <dd class="mt-1 break-words text-zinc-300">
              {{ selectedFeedback.user_agent || 'Не передан' }}
            </dd>
          </div>
        </dl>
      </article>
    </design-system-modal>
    <design-system-modal
      v-model:is-open="isFilmModalOpen"
      size="wide"
      :title="
        filmModalMode === 'edit' ? 'Редактирование фильма' : 'Карточка фильма'
      "
    >
      <p v-if="isFilmDetailsLoading" class="py-10 text-center text-zinc-400">
        Загрузка карточки…
      </p>
      <article
        v-else-if="filmDetails && filmModalMode === 'details'"
        class="film-detail-card"
      >
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
                {{ filmDetails.name_en || 'Оригинальное название не указано' }}
              </p>
              <h2>{{ filmDetails.name || 'Без названия' }}</h2>
            </div>
            <span
              class="admin-status"
              :class="{
                'is-verified': filmDetails.verified && !filmDetails.deleted,
                'is-pending': !filmDetails.verified && !filmDetails.deleted,
                'is-deleted': filmDetails.deleted,
              }"
            >
              {{ getFilmStatusLabel(filmDetails) }}
            </span>
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
                  filmDetails.duration ? `${filmDetails.duration} мин.` : '—'
                }}
              </dd>
            </div>
            <div>
              <dt>Рейтинг</dt>
              <dd>
                {{ filmDetails.rating ? filmDetails.rating.toFixed(1) : '—' }}
              </dd>
            </div>
            <div>
              <dt>Возраст</dt>
              <dd>
                {{
                  filmDetails.rating_age ? `${filmDetails.rating_age}+` : '—'
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
            >
            <a
              v-if="filmDetails.cover_url"
              :href="filmDetails.cover_url"
              target="_blank"
              rel="noopener"
              >Обложка ↗</a
            >
          </p>
          <div class="film-detail-actions">
            <NuxtLink :to="`/film/${filmDetails._id}`" class="film-button"
              >Открыть на сайте</NuxtLink
            >
            <button
              v-if="filmDetails.deleted"
              class="film-button film-button-primary"
              :disabled="isFilmPending(filmDetails._id)"
              @click="moderate(filmDetails, 'restore')"
            >
              Восстановить
            </button>
            <button
              v-else-if="!filmDetails.verified"
              class="film-button film-button-primary"
              :disabled="isFilmPending(filmDetails._id)"
              @click="moderate(filmDetails, 'verify')"
            >
              В пул
            </button>
            <button
              v-else
              class="film-button"
              :disabled="isFilmPending(filmDetails._id)"
              @click="moderate(filmDetails, 'unverify')"
            >
              На проверку
            </button>
            <button class="film-button" @click="beginEdit(filmDetails)">
              Редактировать
            </button>
            <button
              v-if="!filmDetails.deleted"
              class="film-button film-button-danger"
              :disabled="isFilmPending(filmDetails._id)"
              @click="moderate(filmDetails, 'hide')"
            >
              Скрыть
            </button>
          </div>
        </div>
      </article>
      <form
        v-else-if="selected && filmModalMode === 'edit'"
        class="film-edit-form space-y-5"
        @submit.prevent="save"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <label
            >Название<input v-model="selected.name" class="admin-input"
          /></label>
          <label
            >Название на английском<input
              v-model="selected.name_en"
              class="admin-input"
          /></label>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label
            >Год<input
              v-model.number="selected.year"
              type="number"
              min="1888"
              class="admin-input"
          /></label>
          <label
            >Длительность<input
              v-model.number="selected.duration"
              type="number"
              min="0"
              class="admin-input"
          /></label>
          <label
            >Возраст<input
              v-model.number="selected.rating_age"
              type="number"
              min="0"
              class="admin-input"
          /></label>
          <label
            >Рейтинг<input
              v-model.number="selected.rating"
              type="number"
              min="0"
              max="10"
              step="0.1"
              class="admin-input"
          /></label>
          <label
            >MPAA<select v-model="selected.rating_mpaa" class="admin-input">
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
        <label
          >URL постера<input v-model="selected.poster_url" class="admin-input"
        /></label>
        <label
          >URL фоновой картинки<input
            v-model="selected.cover_url"
            class="admin-input"
        /></label>
        <label
          >URL трейлера<input
            v-model="selected.trailer_url"
            class="admin-input"
        /></label>
        <label
          >Описание<textarea
            v-model="selected.description"
            rows="5"
            class="admin-input"
          />
        </label>
        <label
          >Описание на английском<textarea
            v-model="selected.description_en"
            rows="4"
            class="admin-input"
          />
        </label>
        <fieldset>
          <legend>Страны</legend>
          <div class="admin-checkbox-grid">
            <label v-for="country in countryOptions" :key="country._id"
              ><input
                v-model="selected.countries"
                type="checkbox"
                :value="country._id"
              />{{ country.name }}</label
            >
          </div>
        </fieldset>
        <fieldset>
          <legend>Жанры</legend>
          <div class="admin-checkbox-grid">
            <label v-for="tag in tagOptions" :key="tag._id"
              ><input
                v-model="selected.tags"
                type="checkbox"
                :value="tag._id"
              />{{ tag.name }}</label
            >
          </div>
        </fieldset>
        <fieldset>
          <legend>Подборки</legend>
          <div class="admin-checkbox-grid">
            <label v-for="group in groupOptions" :key="group._id"
              ><input
                v-model="selected.groups"
                type="checkbox"
                :value="group._id"
              />{{ group.name }}</label
            >
          </div>
        </fieldset>
        <p
          class="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-zinc-400"
        >
          Состав команды фильма здесь не редактируется. Персоны доступны только
          для просмотра и управления в собственном разделе.
        </p>
        <div class="film-detail-actions">
          <button type="submit" class="film-button film-button-primary">
            Сохранить
          </button>
          <button
            type="button"
            class="film-button"
            @click="
              filmModalMode = 'details';
              selected = null;
              selectedOriginal = null;
            "
          >
            Отмена
          </button>
        </div>
      </form>
    </design-system-modal>
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
  position: relative;
  overflow: hidden;
  border: 1px solid #34363e;
  border-radius: 10px;
  background: #1c1e24;
  cursor: pointer;
  transition:
    transform 0.15s,
    border-color 0.15s;
}
.film-admin-card.is-moderation-mode {
  border-color: rgb(247 201 72 / 55%);
  cursor: crosshair;
}
.film-admin-card.is-pending-request {
  pointer-events: none;
  opacity: 0.55;
}
.film-admin-card:hover {
  transform: translateY(-2px);
  border-color: #5a5e69;
}
.film-admin-info {
  padding: 12px;
}

.film-info-button {
  position: absolute;
  z-index: 2;
  top: 8px;
  right: 8px;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 25%);
  border-radius: 999px;
  background: rgb(17 18 22 / 88%);
  color: #fff;
  font-family: Georgia, serif;
  font-size: 17px;
  font-weight: 700;
  box-shadow: 0 4px 18px rgb(0 0 0 / 35%);
}
.film-info-button:hover {
  border-color: #f7c948;
  color: #f7c948;
}

.moderation-toolbar {
  position: sticky;
  z-index: 10;
  top: 8px;
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
  padding: 12px;
  border: 1px solid #3a3d46;
  border-radius: 12px;
  background: rgb(28 30 36 / 94%);
  box-shadow: 0 12px 28px rgb(0 0 0 / 25%);
  backdrop-filter: blur(12px);
}
.admin-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 8px;
}
.admin-filter-control {
  min-height: 40px;
  min-width: 0;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 12px;
  background: #18181b;
  padding: 8px 12px;
  color: #fff;
  font-size: 14px;
}
.admin-rating-filter {
  display: grid;
  gap: 4px;
  color: #a1a1aa;
  font-size: 11px;
}
.admin-rating-range {
  display: flex;
  gap: 8px;
}
.admin-reference-filter {
  display: grid;
  width: 220px;
  gap: 4px;
  color: #a1a1aa;
  font-size: 11px;
}
.admin-reference-filter :deep(button[aria-expanded]) {
  min-height: 40px;
  border-radius: 12px;
  background: #18181b;
  padding: 8px 12px;
}
.admin-reference-filter :deep(.absolute) {
  min-width: 280px;
}
.admin-rating-filter .admin-filter-control {
  width: 96px;
}
.admin-filter-button {
  min-height: 40px;
  border-radius: 12px;
  background: rgb(255 255 255 / 10%);
  padding: 8px 16px;
  color: #fff;
  font-size: 14px;
}
.admin-filter-total {
  align-self: center;
  font-size: 14px;
}
.film-status-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
}
.film-status-tabs button {
  min-height: 38px;
  flex: 0 0 auto;
  padding: 0 12px;
  border: 1px solid #484b55;
  border-radius: 9px;
  color: #d4d4d8;
  font-size: 13px;
}
.film-status-tabs button.is-active {
  border-color: #f7c948;
  background: #f7c948;
  color: #171717;
  font-weight: 700;
}
.moderation-toggle {
  display: flex;
  align-items: center;
  gap: 9px;
  width: fit-content;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}
.moderation-toggle input {
  width: 18px;
  height: 18px;
  accent-color: #f7c948;
}
.moderation-legend {
  color: #fcd34d;
  font-size: 12px;
}
.moderation-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #a1a1aa;
  font-size: 12px;
}
.moderation-summary button,
.load-more button {
  min-height: 38px;
  padding: 0 13px;
  border: 1px solid #5a5e69;
  border-radius: 9px;
  background: #292c34;
  color: #fff;
}
.moderation-summary button:disabled {
  opacity: 0.45;
}

.film-card-actions {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.film-card-action {
  min-height: 36px;
  padding: 6px 8px;
  border: 1px solid #484b55;
  border-radius: 7px;
  color: #e4e4e7;
  font-size: 11px;
}
.film-card-action.is-primary {
  border-color: rgb(247 201 72 / 55%);
  color: #fcd34d;
}
.film-card-action.is-danger {
  color: #fca5a5;
}
.film-card-action:disabled {
  opacity: 0.45;
}
.empty-film-list {
  grid-column: 1 / -1;
  padding: 48px 16px;
  text-align: center;
  color: #a1a1aa;
}
.load-more {
  display: grid;
  min-height: 72px;
  place-items: center;
  padding: 16px;
  color: #a1a1aa;
  font-size: 13px;
}
.admin-swipe-workspace {
  display: grid;
  max-width: 820px;
  gap: 14px;
  margin: 0 auto 32px;
}
.admin-swipe-workspace.is-fullscreen {
  position: fixed;
  z-index: 40;
  inset: 0;
  max-width: none;
  align-content: start;
  overflow-y: auto;
  margin: 0;
  padding: 20px max(20px, calc((100vw - 980px) / 2)) 36px;
  background:
    radial-gradient(circle at 50% 10%, rgb(247 201 72 / 9%), transparent 35%),
    #111216;
  overscroll-behavior: contain;
}
.admin-swipe-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.admin-swipe-header strong {
  display: block;
  margin-bottom: 8px;
  color: #fff;
  font-size: 15px;
}
.admin-swipe-progress {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.admin-swipe-progress span {
  padding: 6px 10px;
  border-radius: 999px;
  background: #292c34;
  color: #d4d4d8;
  font-size: 12px;
}
.admin-fullscreen-button {
  min-height: 40px;
  flex: 0 0 auto;
  padding: 0 14px;
  border: 1px solid #5a5e69;
  border-radius: 10px;
  background: #292c34;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}
.admin-swipe-hints {
  display: none;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  color: #a1a1aa;
  font-size: 12px;
  text-align: center;
}
.admin-swipe-hints span {
  padding: 8px;
  border: 1px solid #34363e;
  border-radius: 10px;
  background: #1c1e24;
}
.admin-swipe-hints b {
  color: #fcd34d;
}
.admin-swipe-workspace.is-fullscreen .admin-swipe-hints {
  display: grid;
}
.admin-swipe-stack {
  position: relative;
  isolation: isolate;
  min-height: 500px;
}
.admin-swipe-workspace.is-fullscreen .admin-swipe-stack {
  min-height: min(650px, calc(100dvh - 155px));
}
.admin-swipe-workspace.is-fullscreen
  .admin-swipe-stack
  > :deep(.admin-swipe-card) {
  height: calc(100dvh - 165px);
  min-height: 440px;
  max-height: 680px;
}
.admin-swipe-workspace.is-fullscreen
  .admin-swipe-stack
  > :deep(.admin-swipe-card .admin-swipe-poster) {
  min-height: 0;
}
.admin-swipe-workspace.is-fullscreen
  .admin-swipe-stack
  > :deep(.admin-swipe-card .admin-swipe-content) {
  overflow-y: auto;
  overscroll-behavior: contain;
}
.admin-swipe-stack > :deep(.admin-swipe-card) {
  position: relative;
  z-index: 2;
}
.admin-swipe-card-back {
  position: absolute;
  z-index: 1;
  inset: 14px 22px -10px;
  overflow: hidden;
  border: 1px solid #34363e;
  border-radius: 24px;
  background: #1c1e24;
  opacity: 0.42;
  transform: scale(0.97);
}
.admin-swipe-card-back::after {
  position: absolute;
  inset: 0;
  background: rgb(17 18 22 / 72%);
  content: '';
}
.admin-swipe-card-back :deep(img) {
  height: 100%;
  object-fit: cover;
}
.admin-swipe-empty {
  display: grid;
  min-height: 360px;
  place-items: center;
  border: 1px dashed #484b55;
  border-radius: 24px;
  color: #a1a1aa;
  text-align: center;
}
.admin-swipe-empty button {
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid rgb(247 201 72 / 45%);
  border-radius: 10px;
  color: #fcd34d;
  font-size: 13px;
  font-weight: 700;
}
.admin-swipe-empty button:disabled {
  opacity: 0.45;
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
.is-deleted {
  color: #fca5a5;
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
.film-edit-form label,
.film-edit-form legend {
  color: #d4d4d8;
  font-size: 13px;
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
  .moderation-toolbar {
    top: 4px;
  }
  .admin-filters {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .admin-filter-control,
  .admin-filter-button,
  .admin-rating-filter .admin-filter-control {
    width: 100%;
  }
  .admin-rating-range {
    grid-column: 1 / -1;
  }
  .admin-reference-filter {
    width: 100%;
  }
  .admin-reference-filter :deep(.absolute) {
    min-width: 100%;
  }
  .admin-rating-filter {
    min-width: 0;
    flex: 1 1 0;
  }
  .admin-filters > input:first-child,
  .admin-filter-button,
  .admin-filter-total {
    grid-column: 1 / -1;
  }
  .moderation-summary {
    align-items: flex-start;
    flex-direction: column;
  }
  .moderation-summary button {
    width: 100%;
  }
  .admin-swipe-stack {
    min-height: 540px;
  }
  .admin-swipe-workspace.is-fullscreen {
    padding: 12px 10px 24px;
  }
  .admin-swipe-header {
    align-items: flex-start;
  }
  .admin-fullscreen-button {
    min-height: 44px;
  }
  .admin-swipe-workspace.is-fullscreen .admin-swipe-stack {
    min-height: 590px;
  }
  .admin-swipe-workspace.is-fullscreen
    .admin-swipe-stack
    > :deep(.admin-swipe-card) {
    height: calc(100dvh - 155px);
    min-height: 500px;
  }
  .admin-swipe-card-back {
    inset: 10px 10px -8px;
    border-radius: 18px;
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
