<script setup lang="ts">
const tagStore = useTagStore();
const countryStore = useCountryStore();
const personStore = usePersonStore();
const filmGroupStore = useFilmGroupStore();
const filmStore = useFilmStore();

const props = defineProps<{ filters: IFilmFilter }>();
const emit = defineEmits(['save-filters']);

const nowYear = new Date().getFullYear();

const localFilters = reactive<ISettingFilmFilters>({
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
  year: [props.filters.year_from ?? 1960, props.filters.year_to ?? nowYear],
  ageRatings: props.filters.age_ratings ?? [],
  mpaaRatings: props.filters.mpaa_ratings ?? [],
});
const totalFilms = ref<number | null>(null);
const totalFilmsStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle');
let totalTimeout: ReturnType<typeof setTimeout> | null = null;
let totalRequestVersion = 0;

const scheduleTotalRefresh = () => {
  if (totalTimeout) clearTimeout(totalTimeout);
  totalFilmsStatus.value = 'pending';
  const version = ++totalRequestVersion;
  totalTimeout = setTimeout(
    async () => {
      try {
        const total = await filmStore.getOneFastFilter(
          mapSettingsToFilmFilter(localFilters),
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

watch(localFilters, scheduleTotalRefresh, { deep: true, immediate: true });
onBeforeUnmount(() => {
  if (totalTimeout) clearTimeout(totalTimeout);
});

const promisesLoadEntities: Promise<unknown>[] = [];
/** load entities by filter **/
const selectedGroupIds =
  props.filters.groups ??
  (props.filters.group_id ? [props.filters.group_id] : undefined);
if (selectedGroupIds?.length) {
  promisesLoadEntities.push(
    useAsyncData('selectedFilmGroups', async () =>
      filmGroupStore.getList({
        limit: selectedGroupIds.length,
        offset: 0,
        ids: selectedGroupIds,
      }),
    ).then(({ data }) => {
      if (data.value) {
        localFilters.groups = data.value.map((el) => ({
          label: el.name,
          value: el._id,
        }));
        filmGroupStore.groups = [];
      }
    }),
  );
}
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
const groupFilter = reactive<FilmGroupFilter>({
  limit: 20,
  offset: 0,
  search: '',
  sort: 'name:asc',
});
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
  { status: groupsApiStatus },
  { status: tagApiStatus },
  { status: countriesApiStatus },
  { status: personsApiStatus },
] = await Promise.all([
  useAsyncData(
    'filmGroupsFilter',
    async () => filmGroupStore.getList(groupFilter),
    {
      watch: [groupFilter],
    },
  ),
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

const handleSearchGroups = (data: string) => {
  filmGroupStore.groups = [];
  groupFilter.search = data;
  groupFilter.offset = 0;
};
const handleLoadMoreGroups = () => {
  if (groupsApiStatus.value !== 'success') return;
  const offset = groupFilter.offset + groupFilter.limit;
  if (offset < (filmGroupStore.groupMeta?.total ?? 0)) {
    groupFilter.offset += groupFilter.limit;
  }
};

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
  emit('save-filters', mapSettingsToFilmFilter(localFilters));
};

const hasActiveFilters = computed(() =>
  Object.values(mapSettingsToFilmFilter(localFilters)).some(
    (value) => value !== undefined,
  ),
);

const resetFilters = () => {
  localFilters.groups = [];
  localFilters.tags = [];
  localFilters.countries = [];
  localFilters.actors = [];
  localFilters.rating = [1, 10];
  localFilters.year = [1960, nowYear];
  localFilters.ageRatings = [];
  localFilters.mpaaRatings = [];
};
</script>

<template>
  <div>
    <div class="mb-6 flex items-start justify-between gap-4">
      <p class="text-sm leading-6 text-zinc-400">
        Фильтры фиксируют выборку до начала комнаты. Чем меньше ограничений, тем
        больше карточек.
      </p>
      <button
        v-if="hasActiveFilters"
        type="button"
        class="shrink-0 rounded-xl border border-white/15 px-3 py-2 text-xs text-zinc-300 transition hover:border-white/30 hover:text-white"
        @click="resetFilters"
      >
        Сбросить всё
      </button>
    </div>
    <div class="space-y-6">
      <div
        class="rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] p-4"
      >
        <label class="mb-2 block text-sm font-medium text-amber-100"
          >Подборки</label
        >
        <p class="mb-3 text-xs leading-5 text-zinc-400">
          Готовые тематические наборы фильмов. Можно выбрать несколько — в
          комнату попадут фильмы хотя бы из одной подборки.
        </p>
        <design-system-multiselect
          v-model:selected-options="localFilters.groups"
          aria-label="Выбрать подборки"
          :is-api="true"
          :search-enabled="true"
          :options="
            filmGroupStore.groups.map((t) => ({ value: t._id, label: t.name }))
          "
          :status="groupsApiStatus"
          @search="handleSearchGroups"
          @load-more="handleLoadMoreGroups"
        />
        <p
          v-if="localFilters.groups.length"
          class="mt-3 text-xs text-amber-200/80"
        >
          Подборки уже задают готовый фильтр, поэтому остальные настройки
          скрыты.
        </p>
      </div>

      <template v-if="!localFilters.groups.length">
        <div>
          <label class="mb-2 block text-sm font-medium text-zinc-200"
            >Жанры</label
          >
          <div class="mb-2 grid grid-cols-2 rounded-xl bg-black/20 p-1 text-xs">
            <button
              v-for="mode in ['include', 'exclude'] as const"
              :key="mode"
              type="button"
              :aria-label="`${mode === 'include' ? 'Включить' : 'Исключить'} жанры`"
              class="min-h-9 rounded-lg px-3 transition"
              :class="
                localFilters.tagsMode === mode
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-500'
              "
              @click="localFilters.tagsMode = mode"
            >
              {{ mode === 'include' ? 'Включить' : 'Исключить' }}
            </button>
          </div>
          <design-system-multiselect
            v-model:selected-options="localFilters.tags"
            aria-label="Выбрать жанры"
            :is-api="true"
            :search-enabled="true"
            :options="
              tagStore.tags.map((t) => ({ value: t._id, label: t.name }))
            "
            :status="tagApiStatus"
            @search="handleSearchTags"
            @load-more="handleLoadMoreTags"
          />
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-zinc-200"
            >Страны</label
          >
          <div class="mb-2 grid grid-cols-2 rounded-xl bg-black/20 p-1 text-xs">
            <button
              v-for="mode in ['include', 'exclude'] as const"
              :key="mode"
              type="button"
              :aria-label="`${mode === 'include' ? 'Включить' : 'Исключить'} страны`"
              class="min-h-9 rounded-lg px-3 transition"
              :class="
                localFilters.countriesMode === mode
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-500'
              "
              @click="localFilters.countriesMode = mode"
            >
              {{ mode === 'include' ? 'Включить' : 'Исключить' }}
            </button>
          </div>
          <design-system-multiselect
            v-model:selected-options="localFilters.countries"
            aria-label="Выбрать страны"
            :is-api="true"
            :search-enabled="true"
            :options="
              countryStore.countries.map((t) => ({
                value: t._id,
                label: t.name,
              }))
            "
            :status="countriesApiStatus"
            @search="handleSearchCountries"
            @load-more="handleLoadMoreCountries"
          />
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-zinc-200"
            >Персоны</label
          >
          <div class="mb-2 grid grid-cols-2 rounded-xl bg-black/20 p-1 text-xs">
            <button
              v-for="mode in ['include', 'exclude'] as const"
              :key="mode"
              type="button"
              :aria-label="`${mode === 'include' ? 'Включить' : 'Исключить'} персон`"
              class="min-h-9 rounded-lg px-3 transition"
              :class="
                localFilters.actorsMode === mode
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-500'
              "
              @click="localFilters.actorsMode = mode"
            >
              {{ mode === 'include' ? 'Включить' : 'Исключить' }}
            </button>
          </div>
          <design-system-multiselect
            v-model:selected-options="localFilters.actors"
            aria-label="Выбрать персон"
            :is-api="true"
            :search-enabled="true"
            :options="
              personStore.persons.map((t) => ({ value: t._id, label: t.name }))
            "
            :status="personsApiStatus"
            @search="handleSearchPersons"
            @load-more="handleLoadMorePersons"
          />
        </div>
        <div>
          <label class="mb-4 block text-sm font-medium text-zinc-200"
            >Год выпуска</label
          >
          <div class="relative w-full pb-4">
            <design-system-multi-range
              v-model="localFilters.year"
              :max="nowYear"
              :min="1960"
              :step="1"
            />
          </div>
        </div>
        <div>
          <label class="mb-4 block text-sm font-medium text-zinc-200"
            >Рейтинг</label
          >
          <div class="relative w-full pb-4">
            <design-system-multi-range
              v-model="localFilters.rating"
              :max="10"
              :min="1"
              :step="0.1"
            />
          </div>
        </div>
        <fieldset>
          <legend class="mb-2 text-sm font-medium text-zinc-200">
            Возрастной рейтинг
          </legend>
          <div class="grid grid-cols-5 gap-2">
            <button
              v-for="rating in [0, 6, 12, 16, 18]"
              :key="rating"
              :class="{
                'border-amber-300 bg-amber-300 text-zinc-950':
                  localFilters.ageRatings.includes(rating),
                'border-white/10 bg-white/5 text-zinc-400':
                  !localFilters.ageRatings.includes(rating),
              }"
              type="button"
              class="min-h-11 rounded-xl border text-sm"
              @click="toggleAgeRating(rating)"
            >
              {{ rating }}+
            </button>
          </div>
        </fieldset>

        <fieldset>
          <legend class="mb-2 text-sm font-medium text-zinc-200">MPAA</legend>
          <div class="grid grid-cols-5 gap-2">
            <button
              v-for="rating in ['G', 'PG', 'PG13', 'R', 'NC17']"
              :key="rating"
              :class="{
                'border-amber-300 bg-amber-300 text-zinc-950':
                  localFilters.mpaaRatings.includes(rating),
                'border-white/10 bg-white/5 text-zinc-400':
                  !localFilters.mpaaRatings.includes(rating),
              }"
              type="button"
              class="min-h-11 rounded-xl border text-xs"
              @click="toggleMpaaRating(rating)"
            >
              {{ rating }}
            </button>
          </div>
        </fieldset>
      </template>
    </div>
    <div
      class="sticky -bottom-5 mt-7 border-t border-white/10 bg-[#151820]/95 py-4 backdrop-blur"
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
      <design-system-button
        aria-label="Сохранить фильтры"
        :disabled="totalFilmsStatus !== 'success' || totalFilms === 0"
        :loading="totalFilmsStatus === 'pending'"
        @click="saveFilters"
      >
        Сохранить · {{ totalFilms ?? '…' }} фильмов
      </design-system-button>
    </div>
  </div>
</template>

<style scoped></style>
