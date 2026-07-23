<script setup lang="ts">
import { ERoomFilmOrder } from '~/types';
import { MIN_FILM_YEAR } from '~/utils/helpers';

const tagStore = useTagStore();
const countryStore = useCountryStore();
const personStore = usePersonStore();
const filmGroupStore = useFilmGroupStore();
const filmStore = useFilmStore();

type OrderCriterion = 'year' | 'rating' | 'name' | 'duration' | 'random';

const orderCriteria: Array<{
  value: OrderCriterion;
  icon: string;
  label: string;
  description: string;
}> = [
  {
    value: 'year',
    icon: 'lucide:calendar-days',
    label: 'По году',
    description: 'Новинки или классика',
  },
  {
    value: 'rating',
    icon: 'lucide:star',
    label: 'По рейтингу',
    description: 'Лучшие или необычные',
  },
  {
    value: 'name',
    icon: 'lucide:arrow-down-a-z',
    label: 'По названию',
    description: 'По алфавиту',
  },
  {
    value: 'duration',
    icon: 'lucide:clock-3',
    label: 'По длительности',
    description: 'Короче или длиннее',
  },
  {
    value: 'random',
    icon: 'lucide:shuffle',
    label: 'Перемешать',
    description: 'Новый случайный порядок',
  },
];

const orderDirections: Record<
  Exclude<OrderCriterion, 'random'>,
  Array<{ value: ERoomFilmOrder; label: string }>
> = {
  year: [
    { value: ERoomFilmOrder.yearDesc, label: 'Сначала новые' },
    { value: ERoomFilmOrder.yearAsc, label: 'Сначала старые' },
  ],
  rating: [
    { value: ERoomFilmOrder.ratingDesc, label: 'Сначала высокий' },
    { value: ERoomFilmOrder.ratingAsc, label: 'Сначала низкий' },
  ],
  name: [
    { value: ERoomFilmOrder.nameAsc, label: 'От А до Я' },
    { value: ERoomFilmOrder.nameDesc, label: 'От Я до А' },
  ],
  duration: [
    { value: ERoomFilmOrder.durationAsc, label: 'Сначала короткие' },
    { value: ERoomFilmOrder.durationDesc, label: 'Сначала длинные' },
  ],
};

const criterionByOrder: Record<ERoomFilmOrder, OrderCriterion> = {
  [ERoomFilmOrder.yearDesc]: 'year',
  [ERoomFilmOrder.yearAsc]: 'year',
  [ERoomFilmOrder.ratingDesc]: 'rating',
  [ERoomFilmOrder.ratingAsc]: 'rating',
  [ERoomFilmOrder.nameAsc]: 'name',
  [ERoomFilmOrder.nameDesc]: 'name',
  [ERoomFilmOrder.durationAsc]: 'duration',
  [ERoomFilmOrder.durationDesc]: 'duration',
  [ERoomFilmOrder.random]: 'random',
};

const props = withDefaults(
  defineProps<{ filters: IFilmFilter; saving?: boolean }>(),
  { saving: false },
);
const emit = defineEmits(['save-filters']);

const nowYear = new Date().getFullYear();
type FilterMode = 'collections' | 'custom';
const hasStoredCustomFilters = Boolean(
  props.filters.tags?.length ||
  props.filters.exclude_tags?.length ||
  props.filters.countries?.length ||
  props.filters.exclude_countries?.length ||
  props.filters.actors?.length ||
  props.filters.exclude_actors?.length ||
  props.filters.rating_from ||
  props.filters.rating_to ||
  props.filters.year_from ||
  props.filters.year_to ||
  props.filters.age_ratings?.length ||
  props.filters.mpaa_ratings?.length,
);
const filterMode = ref<FilterMode>(
  props.filters.groups?.length || props.filters.group_id
    ? 'collections'
    : hasStoredCustomFilters
      ? 'custom'
      : 'collections',
);
const additionalFiltersOpen = ref(
  Boolean(
    props.filters.age_ratings?.length || props.filters.mpaa_ratings?.length,
  ),
);

const localFilters = reactive<ISettingFilmFilters>({
  order: props.filters.order ?? ERoomFilmOrder.random,
  groups: [],
  tags: [],
  tagsMode: props.filters.exclude_tags?.length ? 'exclude' : 'include',
  countries: [],
  countriesMode: props.filters.exclude_countries?.length
    ? 'exclude'
    : 'include',
  actors: [],
  actorsMode: props.filters.exclude_actors?.length ? 'exclude' : 'include',
  rating: [props.filters.rating_from ?? 1, props.filters.rating_to ?? 10],
  year: [
    props.filters.year_from ?? MIN_FILM_YEAR,
    props.filters.year_to ?? nowYear,
  ],
  ageRatings: props.filters.age_ratings ?? [],
  mpaaRatings: props.filters.mpaa_ratings ?? [],
});
const selectedOrderCriterion = computed<OrderCriterion>(
  () => criterionByOrder[localFilters.order]!,
);
const selectedOrderDirections = computed(() =>
  selectedOrderCriterion.value === 'random'
    ? []
    : orderDirections[selectedOrderCriterion.value],
);
const selectOrderCriterion = (criterion: OrderCriterion) => {
  localFilters.order =
    criterion === 'random'
      ? ERoomFilmOrder.random
      : orderDirections[criterion][0]!.value;
};
const totalFilms = ref<number | null>(null);
const totalFilmsStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle');
let totalTimeout: ReturnType<typeof setTimeout> | null = null;
let totalRequestVersion = 0;

const getEffectiveFilmFilter = (): IFilmFilter =>
  filterMode.value === 'collections'
    ? {
        groups: localFilters.groups.length
          ? localFilters.groups.map(({ value }) => value.toString())
          : undefined,
        order: localFilters.order,
      }
    : mapSettingsToFilmFilter({ ...localFilters, groups: [] });

const scheduleTotalRefresh = () => {
  if (totalTimeout) clearTimeout(totalTimeout);
  totalFilmsStatus.value = 'pending';
  const version = ++totalRequestVersion;
  totalTimeout = setTimeout(
    async () => {
      try {
        const total = await filmStore.getOneFastFilter(
          getEffectiveFilmFilter(),
        );
        if (version !== totalRequestVersion) return;
        totalFilms.value = total;
        totalFilmsStatus.value = 'success';
      } catch {
        if (version === totalRequestVersion) totalFilmsStatus.value = 'error';
      }
    },
    version === 1 ? 0 : 450,
  );
};

watch([localFilters, filterMode], scheduleTotalRefresh, {
  deep: true,
  immediate: true,
});
onBeforeUnmount(() => {
  if (totalTimeout) clearTimeout(totalTimeout);
});

const promisesLoadEntities: Promise<unknown>[] = [];
/** load entities by filter **/
const selectedGroupIds =
  props.filters.groups ??
  (props.filters.group_id ? [props.filters.group_id] : undefined);
const selectedTagIds = props.filters.tags ?? props.filters.exclude_tags;
if (selectedTagIds?.length) {
  promisesLoadEntities.push(
    useAsyncData('selectedTags', async () =>
      tagStore.getList({
        limit: selectedTagIds.length,
        offset: 0,
        ids: selectedTagIds,
      }),
    ).then(({ data }) => {
      if (data.value) {
        localFilters.tags = data.value.map((el) => ({
          label: el.name,
          value: el._id,
        }));
        tagStore.tags = [];
      }
    }),
  );
}
const selectedCountryIds =
  props.filters.countries ?? props.filters.exclude_countries;
if (selectedCountryIds?.length) {
  promisesLoadEntities.push(
    useAsyncData('selectedCountries', async () =>
      countryStore.getList({
        limit: selectedCountryIds.length,
        offset: 0,
        ids: selectedCountryIds,
      }),
    ).then(({ data }) => {
      if (data.value) {
        localFilters.countries = data.value.map((el) => ({
          label: el.name,
          value: el._id,
        }));
        countryStore.countries = [];
      }
    }),
  );
}
const selectedActorIds = props.filters.actors ?? props.filters.exclude_actors;
if (selectedActorIds?.length) {
  promisesLoadEntities.push(
    useAsyncData('selectedPersons', async () =>
      personStore.getList({
        limit: selectedActorIds.length,
        offset: 0,
        ids: selectedActorIds,
      }),
    ).then(({ data }) => {
      if (data.value) {
        localFilters.actors = data.value.map((el) => ({
          label: el.name,
          value: el._id,
        }));
        personStore.persons = [];
      }
    }),
  );
}
/** end **/
await Promise.all(promisesLoadEntities);
/** load filter */
const tagFilter = reactive<TagFilter>({
  limit: 20,
  offset: 0,
  search: '',
  sort: 'name:asc',
});
const countryFilter = reactive<CountryFilter>({
  limit: 20,
  offset: 0,
  search: '',
  sort: 'name:asc',
});
const personFilter = reactive<PersonFilter>({
  limit: 20,
  offset: 0,
  search: '',
  sort: 'name:asc',
  positions: [
    EPersonPosition.Directors,
    EPersonPosition.Scriptwriters,
    EPersonPosition.Actors,
    EPersonPosition.DubbingActors,
  ],
});

const [
  { data: filmGroupsData, status: groupsApiStatus },
  { status: tagApiStatus },
  { status: countriesApiStatus },
  { status: personsApiStatus },
] = await Promise.all([
  useAsyncData('filmGroupsCatalog', async () => filmGroupStore.getAll()),
  useAsyncData('tagsFilter', async () => tagStore.getList(tagFilter), {
    watch: [tagFilter],
  }),
  useAsyncData(
    'countriesFilter',
    async () => countryStore.getList(countryFilter),
    {
      watch: [countryFilter],
    },
  ),
  useAsyncData('personsFilter', async () => personStore.getList(personFilter), {
    watch: [personFilter],
  }),
]);

if (selectedGroupIds?.length) {
  const selectedIds = new Set(selectedGroupIds.map(String));
  localFilters.groups = (filmGroupsData.value ?? [])
    .filter(({ _id }) => selectedIds.has(_id))
    .map(({ _id, name }) => ({ value: _id, label: name }));
}

const handleSearchTags = (data: string) => {
  tagStore.tags = [];
  tagFilter.search = data;
  tagFilter.offset = 0;
};
const handleLoadMoreTags = () => {
  if (tagApiStatus.value !== 'success') return;
  const offset = tagFilter.offset + tagFilter.limit;
  if (offset <= (tagStore.tagMeta?.total ?? 0)) {
    tagFilter.offset += tagFilter.limit;
  }
};
const handleSearchPersons = (data: string) => {
  personStore.persons = [];
  personFilter.search = data;
  personFilter.offset = 0;
};
const handleLoadMorePersons = () => {
  if (personsApiStatus.value !== 'success') return;
  const offset = personFilter.offset + personFilter.limit;
  if (offset <= (personStore.personMeta?.total ?? 0)) {
    personFilter.offset += personFilter.limit;
  }
};
const handleSearchCountries = (data: string) => {
  countryStore.countries = [];
  countryFilter.search = data;
  countryFilter.offset = 0;
};
const handleLoadMoreCountries = () => {
  if (countriesApiStatus.value !== 'success') return;
  const offset = countryFilter.offset + countryFilter.limit;
  if (offset <= (countryStore.countryMeta?.total ?? 0)) {
    countryFilter.offset += countryFilter.limit;
  }
};
/** end */

const toggleAgeRating = (rating: number) => {
  const index = localFilters.ageRatings.indexOf(rating);
  if (index === -1) {
    localFilters.ageRatings.push(rating);
  } else {
    localFilters.ageRatings.splice(index, 1);
  }
};

const toggleMpaaRating = (rating: string) => {
  const index = localFilters.mpaaRatings.indexOf(rating);
  if (index === -1) {
    localFilters.mpaaRatings.push(rating);
  } else {
    localFilters.mpaaRatings.splice(index, 1);
  }
};

const saveFilters = () => {
  emit('save-filters', getEffectiveFilmFilter());
};

const hasActiveFilters = computed(() =>
  Object.entries(getEffectiveFilmFilter()).some(
    ([key, value]) => key !== 'order' && value !== undefined,
  ),
);

const customFilterCount = computed(
  () =>
    Number(Boolean(localFilters.tags.length)) +
    Number(Boolean(localFilters.countries.length)) +
    Number(Boolean(localFilters.actors.length)) +
    Number(localFilters.rating[0] !== 1 || localFilters.rating[1] !== 10) +
    Number(
      localFilters.year[0] !== MIN_FILM_YEAR ||
        localFilters.year[1] !== nowYear,
    ) +
    Number(Boolean(localFilters.ageRatings.length)) +
    Number(Boolean(localFilters.mpaaRatings.length)),
);

const resetFilters = () => {
  if (filterMode.value === 'collections') {
    localFilters.groups = [];
    return;
  }
  localFilters.groups = [];
  localFilters.tags = [];
  localFilters.countries = [];
  localFilters.actors = [];
  localFilters.rating = [1, 10];
  localFilters.year = [MIN_FILM_YEAR, nowYear];
  localFilters.ageRatings = [];
  localFilters.mpaaRatings = [];
};
</script>

<template>
  <div class="min-w-0">
    <div
      class="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]"
    >
      <section class="min-w-0 space-y-5">
        <section>
          <div class="mb-3 flex min-h-9 items-center justify-between gap-3">
            <h3 class="text-sm font-medium text-zinc-200">Как сузить выбор</h3>
            <button
              v-if="hasActiveFilters"
              type="button"
              class="flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs text-zinc-500 transition hover:bg-white/5 hover:text-white"
              @click="resetFilters"
            >
              <icon name="lucide:rotate-ccw" class="size-3.5" />
              Сбросить
            </button>
          </div>
          <div
            class="grid grid-cols-2 gap-2"
            role="group"
            aria-label="Способ фильтрации"
          >
            <button
              type="button"
              class="relative min-h-[6.5rem] overflow-hidden rounded-2xl border p-4 text-left transition"
              :class="
                filterMode === 'collections'
                  ? 'border-amber-300/60 bg-amber-300/[0.1] text-amber-100 shadow-[0_0_0_1px_rgba(252,211,77,0.08)]'
                  : 'border-white/10 bg-white/[0.025] text-zinc-300 hover:border-white/20'
              "
              :aria-pressed="filterMode === 'collections'"
              @click="filterMode = 'collections'"
            >
              <span class="flex items-center gap-2 text-sm font-medium">
                <icon name="lucide:layers-3" class="size-4" />
                Подборки
              </span>
              <span class="mt-2 block text-[11px] leading-4 text-zinc-500">
                Готовая идея в пару касаний
              </span>
              <span
                v-if="localFilters.groups.length"
                class="absolute right-3 top-3 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-semibold text-zinc-950"
              >
                {{ localFilters.groups.length }}
              </span>
            </button>
            <button
              type="button"
              class="relative min-h-[6.5rem] overflow-hidden rounded-2xl border p-4 text-left transition"
              :class="
                filterMode === 'custom'
                  ? 'border-amber-300/60 bg-amber-300/[0.1] text-amber-100 shadow-[0_0_0_1px_rgba(252,211,77,0.08)]'
                  : 'border-white/10 bg-white/[0.025] text-zinc-300 hover:border-white/20'
              "
              :aria-pressed="filterMode === 'custom'"
              @click="filterMode = 'custom'"
            >
              <span class="flex items-center gap-2 text-sm font-medium">
                <icon name="lucide:sliders-horizontal" class="size-4" />
                Свои фильтры
              </span>
              <span class="mt-2 block text-[11px] leading-4 text-zinc-500">
                Точный контроль выборки
              </span>
              <span
                v-if="customFilterCount"
                class="absolute right-3 top-3 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-semibold text-zinc-950"
              >
                {{ customFilterCount }}
              </span>
            </button>
          </div>
        </section>

        <div
          v-if="filterMode === 'collections'"
          data-testid="room-collections-panel"
          class="relative overflow-hidden rounded-3xl border border-amber-300/25 bg-gradient-to-br from-amber-300/[0.1] via-amber-300/[0.04] to-transparent p-5"
        >
          <div
            class="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-amber-300/10 blur-3xl"
          />
          <div class="relative">
            <p
              class="text-xs font-medium uppercase tracking-[0.18em] text-amber-300/70"
            >
              Быстрый старт
            </p>
            <h3 class="mt-2 text-lg font-medium text-white">
              Выберите настроение вечера
            </h3>
            <p class="mt-2 max-w-xl text-xs leading-5 text-zinc-400">
              Можно отметить несколько подборок — фильмы объединятся в одну
              колоду без дополнительных ограничений.
            </p>
            <room-collection-picker
              v-model:selected-options="localFilters.groups"
              class="mt-5"
              :groups="filmGroupStore.groups"
              :loading="groupsApiStatus === 'pending'"
              :error="groupsApiStatus === 'error'"
            />
          </div>
        </div>

        <div v-else class="space-y-4">
          <div class="grid gap-3 md:grid-cols-2">
            <section
              class="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
            >
              <div class="mb-3 flex items-center justify-between gap-3">
                <span
                  class="flex items-center gap-2 text-sm font-medium text-zinc-200"
                >
                  <icon
                    name="lucide:clapperboard"
                    class="size-4 text-zinc-500"
                  />
                  Жанры
                </span>
                <div class="flex rounded-lg bg-black/20 p-0.5 text-[10px]">
                  <button
                    v-for="mode in ['include', 'exclude'] as const"
                    :key="mode"
                    type="button"
                    class="min-h-8 rounded-md px-2.5 transition"
                    :class="
                      localFilters.tagsMode === mode
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-600'
                    "
                    :aria-label="`${mode === 'include' ? 'Включить' : 'Исключить'} жанры`"
                    @click="localFilters.tagsMode = mode"
                  >
                    {{ mode === 'include' ? 'Включить' : 'Исключить' }}
                  </button>
                </div>
              </div>
              <design-system-multiselect
                v-model:selected-options="localFilters.tags"
                aria-label="Выбрать жанры"
                :is-api="true"
                :search-enabled="true"
                :options="
                  tagStore.tags.map((item) => ({
                    value: item._id,
                    label: item.name,
                  }))
                "
                :status="tagApiStatus"
                dropdown-mode="inline"
                @search="handleSearchTags"
                @load-more="handleLoadMoreTags"
              />
            </section>

            <section
              class="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
            >
              <div class="mb-3 flex items-center justify-between gap-3">
                <span
                  class="flex items-center gap-2 text-sm font-medium text-zinc-200"
                >
                  <icon name="lucide:globe-2" class="size-4 text-zinc-500" />
                  Страны
                </span>
                <div class="flex rounded-lg bg-black/20 p-0.5 text-[10px]">
                  <button
                    v-for="mode in ['include', 'exclude'] as const"
                    :key="mode"
                    type="button"
                    class="min-h-8 rounded-md px-2.5 transition"
                    :class="
                      localFilters.countriesMode === mode
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-600'
                    "
                    :aria-label="`${mode === 'include' ? 'Включить' : 'Исключить'} страны`"
                    @click="localFilters.countriesMode = mode"
                  >
                    {{ mode === 'include' ? 'Включить' : 'Исключить' }}
                  </button>
                </div>
              </div>
              <design-system-multiselect
                v-model:selected-options="localFilters.countries"
                aria-label="Выбрать страны"
                :is-api="true"
                :search-enabled="true"
                :options="
                  countryStore.countries.map((item) => ({
                    value: item._id,
                    label: item.name,
                  }))
                "
                :status="countriesApiStatus"
                dropdown-mode="inline"
                @search="handleSearchCountries"
                @load-more="handleLoadMoreCountries"
              />
            </section>

            <section
              class="rounded-2xl border border-white/10 bg-white/[0.025] p-4 md:col-span-2"
            >
              <div class="mb-3 flex items-center justify-between gap-3">
                <span
                  class="flex items-center gap-2 text-sm font-medium text-zinc-200"
                >
                  <icon
                    name="lucide:users-round"
                    class="size-4 text-zinc-500"
                  />
                  Актёры и создатели
                </span>
                <div class="flex rounded-lg bg-black/20 p-0.5 text-[10px]">
                  <button
                    v-for="mode in ['include', 'exclude'] as const"
                    :key="mode"
                    type="button"
                    class="min-h-8 rounded-md px-2.5 transition"
                    :class="
                      localFilters.actorsMode === mode
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-600'
                    "
                    :aria-label="`${mode === 'include' ? 'Включить' : 'Исключить'} персон`"
                    @click="localFilters.actorsMode = mode"
                  >
                    {{ mode === 'include' ? 'Включить' : 'Исключить' }}
                  </button>
                </div>
              </div>
              <design-system-multiselect
                v-model:selected-options="localFilters.actors"
                aria-label="Выбрать персон"
                :is-api="true"
                :search-enabled="true"
                :options="
                  personStore.persons.map((item) => ({
                    value: item._id,
                    label: item.name,
                  }))
                "
                :status="personsApiStatus"
                dropdown-mode="inline"
                @search="handleSearchPersons"
                @load-more="handleLoadMorePersons"
              />
            </section>
          </div>

          <section
            class="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5"
          >
            <div
              class="mb-5 flex items-center gap-2 text-sm font-medium text-zinc-200"
            >
              <icon name="lucide:gauge" class="size-4 text-zinc-500" />
              Диапазоны
            </div>
            <div class="grid gap-6 md:grid-cols-2">
              <div>
                <p class="mb-2 text-xs text-zinc-500">Год выпуска</p>
                <design-system-multi-range
                  v-model="localFilters.year"
                  :max="nowYear"
                  :min="MIN_FILM_YEAR"
                  :step="1"
                />
              </div>
              <div>
                <p class="mb-2 text-xs text-zinc-500">Рейтинг</p>
                <design-system-multi-range
                  v-model="localFilters.rating"
                  :max="10"
                  :min="1"
                  :step="0.1"
                />
              </div>
            </div>
          </section>

          <details
            class="group rounded-2xl border border-white/10 bg-white/[0.025]"
            :open="additionalFiltersOpen"
          >
            <summary
              class="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 text-sm text-zinc-300 marker:content-none sm:px-5"
            >
              <icon name="lucide:badge-check" class="size-4 text-zinc-500" />
              <span class="font-medium">Возрастные ограничения</span>
              <span
                v-if="
                  localFilters.ageRatings.length +
                  localFilters.mpaaRatings.length
                "
                class="shrink-0 whitespace-nowrap rounded-full bg-amber-300/10 px-2.5 py-1 text-[10px] leading-none text-amber-200"
              >
                {{
                  localFilters.ageRatings.length +
                  localFilters.mpaaRatings.length
                }}
                выбрано
              </span>
              <icon
                name="lucide:chevron-down"
                class="ml-auto size-4 text-zinc-600 transition group-open:rotate-180"
              />
            </summary>
            <div class="space-y-5 border-t border-white/8 p-4 sm:p-5">
              <fieldset>
                <legend class="mb-2 text-xs text-zinc-500">
                  Российский рейтинг
                </legend>
                <div class="grid grid-cols-5 gap-1.5 sm:gap-2">
                  <button
                    v-for="rating in [0, 6, 12, 16, 18]"
                    :key="rating"
                    type="button"
                    class="min-h-10 rounded-xl border text-xs transition"
                    :class="
                      localFilters.ageRatings.includes(rating)
                        ? 'border-amber-300 bg-amber-300 text-zinc-950'
                        : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20'
                    "
                    @click="toggleAgeRating(rating)"
                  >
                    {{ rating }}+
                  </button>
                </div>
              </fieldset>
              <fieldset>
                <legend class="mb-2 text-xs text-zinc-500">MPAA</legend>
                <div class="grid grid-cols-5 gap-1.5 sm:gap-2">
                  <button
                    v-for="rating in ['G', 'PG', 'PG13', 'R', 'NC17']"
                    :key="rating"
                    type="button"
                    class="min-h-10 rounded-xl border text-[11px] transition"
                    :class="
                      localFilters.mpaaRatings.includes(rating)
                        ? 'border-amber-300 bg-amber-300 text-zinc-950'
                        : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20'
                    "
                    @click="toggleMpaaRating(rating)"
                  >
                    {{
                      rating === 'PG13'
                        ? 'PG-13'
                        : rating === 'NC17'
                          ? 'NC-17'
                          : rating
                    }}
                  </button>
                </div>
              </fieldset>
            </div>
          </details>
        </div>
      </section>

      <aside
        data-testid="room-order-section"
        class="min-w-0 lg:sticky lg:top-[5.25rem] lg:self-start"
      >
        <section
          class="rounded-3xl border border-white/10 bg-black/15 p-4 sm:p-5"
        >
          <div class="flex items-start gap-3">
            <span
              class="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-zinc-500"
            >
              <icon name="lucide:gallery-vertical-end" class="size-4" />
            </span>
            <div>
              <h3 class="text-sm font-medium text-zinc-100">
                Порядок карточек
              </h3>
              <p class="mt-1 text-xs leading-5 text-zinc-500">
                Один для всех участников и фиксируется при старте.
              </p>
            </div>
          </div>
          <div
            class="mt-4 grid grid-cols-2 gap-2"
            role="group"
            aria-label="Порядок карточек"
          >
            <button
              v-for="criterion in orderCriteria"
              :key="criterion.value"
              type="button"
              class="min-h-[5.25rem] rounded-2xl border p-3 text-left transition"
              :class="[
                selectedOrderCriterion === criterion.value
                  ? 'border-amber-300 bg-amber-300/[0.12] text-amber-100'
                  : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20',
                criterion.value === 'random' ? 'col-span-2' : '',
              ]"
              :aria-pressed="selectedOrderCriterion === criterion.value"
              @click="selectOrderCriterion(criterion.value)"
            >
              <span class="flex items-center gap-2 text-sm font-medium">
                <icon :name="criterion.icon" class="size-4" />
                {{ criterion.label }}
              </span>
              <span class="mt-1.5 block text-[11px] leading-4 text-zinc-500">
                {{ criterion.description }}
              </span>
            </button>
          </div>
          <div
            v-if="selectedOrderDirections.length"
            class="mt-2 grid grid-cols-2 rounded-xl bg-black/25 p-1 text-xs"
          >
            <button
              v-for="direction in selectedOrderDirections"
              :key="direction.value"
              type="button"
              class="min-h-10 rounded-lg px-2 transition"
              :class="
                localFilters.order === direction.value
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              "
              :aria-pressed="localFilters.order === direction.value"
              @click="localFilters.order = direction.value"
            >
              {{ direction.label }}
            </button>
          </div>
          <div
            v-else
            class="mt-3 flex items-start gap-2 rounded-xl bg-amber-300/[0.07] p-3 text-xs leading-5 text-amber-100/80"
          >
            <icon name="lucide:shuffle" class="mt-0.5 size-3.5 shrink-0" />
            Каждый запуск получает новую общую последовательность.
          </div>
        </section>
      </aside>

      <div
        class="sticky -bottom-5 z-20 -mx-5 -mb-5 border-t border-white/10 bg-[#151820] px-5 pb-5 pt-4 after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-[#151820] sm:-bottom-7 sm:-mx-7 sm:-mb-7 sm:px-7 sm:pb-7 lg:col-span-2"
      >
        <p
          v-if="totalFilmsStatus === 'error'"
          class="mb-3 text-center text-xs text-red-300"
        >
          Не удалось посчитать фильмы. Измените фильтр или повторите позже.
        </p>
        <p
          v-else-if="totalFilmsStatus === 'success' && totalFilms === 0"
          class="mb-3 text-center text-xs text-amber-200"
        >
          По этим фильтрам фильмов нет.
        </p>
        <div class="flex items-center gap-3">
          <div class="hidden min-w-0 flex-1 sm:block">
            <p class="text-xs text-zinc-500">В общей колоде</p>
            <p class="mt-0.5 text-sm text-zinc-200">
              {{
                totalFilmsStatus === 'success'
                  ? `${totalFilms} фильмов`
                  : 'Считаем фильмы…'
              }}
            </p>
          </div>
          <div class="w-full sm:max-w-sm">
            <design-system-button
              aria-label="Сохранить фильтры"
              :disabled="
                props.saving ||
                totalFilmsStatus !== 'success' ||
                totalFilms === 0
              "
              :loading="props.saving || totalFilmsStatus === 'pending'"
              @click="saveFilters"
            >
              Сохранить · {{ totalFilms ?? '…' }} фильмов
            </design-system-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
