<script setup lang="ts">
import type { SelectOption } from '~/types';
import type { FilmGroupItem } from '~/stores/film-group';
import {
  filmGroupAccentStyles,
  getFilmGroupSections,
  normalizeFilmGroup,
  toggleFilmGroupSelection,
  type FilmGroupCategory,
} from '~/utils/film-groups';

const props = defineProps<{
  groups: FilmGroupItem[];
  selectedOptions: SelectOption[];
  loading?: boolean;
  error?: boolean;
}>();
const emit = defineEmits<{
  'update:selected-options': [options: SelectOption[]];
}>();

const search = ref('');
const openCategory = ref<FilmGroupCategory | null>(null);
const expandedLayouts = ref<Set<FilmGroupCategory>>(new Set());
const selectedExpanded = ref(false);
const openDescriptionId = ref<string | null>(null);
const selectedPreviewLimit = 4;
const sections = computed(() =>
  getFilmGroupSections(props.groups, search.value),
);
const hasMultipleSections = computed(() => sections.value.length > 1);
const selectedIds = computed(
  () => new Set(props.selectedOptions.map(({ value }) => value.toString())),
);
const selectedGroups = computed(() =>
  props.selectedOptions.map((option) => {
    const group = props.groups.find(
      ({ _id }) => _id === option.value.toString(),
    );
    return normalizeFilmGroup(
      group ?? { _id: option.value.toString(), name: option.label },
    );
  }),
);
const visibleSelectedGroups = computed(() =>
  selectedExpanded.value
    ? selectedGroups.value
    : selectedGroups.value.slice(0, selectedPreviewLimit),
);
const hiddenSelectedCount = computed(() =>
  Math.max(0, selectedGroups.value.length - selectedPreviewLimit),
);

const toggleGroup = (group: FilmGroupItem) => {
  openDescriptionId.value = null;
  emit(
    'update:selected-options',
    toggleFilmGroupSelection(props.selectedOptions, group),
  );
};

const toggleDescription = (id: string) => {
  openDescriptionId.value = openDescriptionId.value === id ? null : id;
};

const removeGroup = (id: string) => {
  emit(
    'update:selected-options',
    props.selectedOptions.filter(({ value }) => value.toString() !== id),
  );
};

const isSectionOpen = (category: FilmGroupCategory) =>
  Boolean(search.value) ||
  !hasMultipleSections.value ||
  openCategory.value === category;

const toggleSection = (category: FilmGroupCategory) => {
  if (!hasMultipleSections.value || search.value) return;
  openCategory.value = openCategory.value === category ? null : category;
};

const toggleLayout = (category: FilmGroupCategory) => {
  const next = new Set(expandedLayouts.value);
  if (next.has(category)) next.delete(category);
  else next.add(category);
  expandedLayouts.value = next;
};

const selectedCountFor = (category: FilmGroupCategory) =>
  selectedGroups.value.filter((group) => group.category === category).length;

watch(
  sections,
  (current) => {
    if (!current.length) {
      openCategory.value = null;
      return;
    }
    if (current.length === 1) {
      openCategory.value = current[0]!.category;
      return;
    }
    if (current.some(({ category }) => category === openCategory.value)) return;
    const selectedCategory = selectedGroups.value.at(-1)?.category;
    openCategory.value =
      current.find(({ category }) => category === selectedCategory)?.category ??
      current.find(({ category }) => category === 'recommended')?.category ??
      current[0]!.category;
  },
  { immediate: true },
);

watch(selectedGroups, (current, previous) => {
  if (current.length <= selectedPreviewLimit) selectedExpanded.value = false;
  if (previous.length || !current.length || !hasMultipleSections.value) return;
  openCategory.value = current.at(-1)!.category;
});
</script>

<template>
  <div class="space-y-4 md:space-y-5">
    <div v-if="selectedGroups.length" aria-label="Выбранные подборки">
      <div class="mb-2 flex min-h-8 items-center justify-between gap-3">
        <p class="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          Выбрано · {{ selectedGroups.length }}
        </p>
        <button
          v-if="hiddenSelectedCount && selectedExpanded"
          type="button"
          class="flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[11px] text-zinc-300 transition hover:bg-white/5 hover:text-white"
          :aria-expanded="selectedExpanded"
          @click="selectedExpanded = !selectedExpanded"
        >
          Свернуть
          <icon name="lucide:chevron-up" class="size-3.5" />
        </button>
      </div>
      <div
        class="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible md:pb-0"
        :class="
          selectedExpanded
            ? 'md:max-h-40 md:overflow-y-auto md:pr-1 [scrollbar-width:thin]'
            : ''
        "
      >
        <button
          v-for="group in visibleSelectedGroups"
          :key="group._id"
          type="button"
          class="flex min-h-9 shrink-0 items-center gap-2 rounded-xl border px-2.5 text-left text-xs transition hover:brightness-125"
          :class="filmGroupAccentStyles[group.accent].chip"
          :aria-label="`Убрать подборку «${group.name}»`"
          @click="removeGroup(group._id)"
        >
          <icon :name="`lucide:${group.icon}`" class="size-3.5 shrink-0" />
          <span>{{ group.name }}</span>
          <icon name="lucide:x" class="size-3 shrink-0 opacity-60" />
        </button>
        <button
          v-if="hiddenSelectedCount && !selectedExpanded"
          type="button"
          class="flex min-h-9 shrink-0 items-center gap-2 rounded-xl border border-amber-300/35 bg-amber-300/10 px-3 text-left text-xs font-medium text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-300/15"
          :aria-expanded="selectedExpanded"
          @click="selectedExpanded = true"
        >
          <icon name="lucide:plus" class="size-3.5" />
          Показать ещё {{ hiddenSelectedCount }}
        </button>
      </div>
    </div>

    <label class="relative block">
      <span class="sr-only">Найти подборку</span>
      <icon
        name="lucide:search"
        class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
      />
      <input
        v-model="search"
        type="search"
        placeholder="Найти подборку"
        class="min-h-11 w-full rounded-2xl border border-white/10 bg-black/20 py-2 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/10"
      />
    </label>

    <div
      v-if="error"
      class="rounded-2xl border border-red-300/15 bg-red-300/[0.04] px-4 py-6 text-center"
    >
      <icon name="lucide:cloud-off" class="mx-auto size-5 text-red-300/70" />
      <p class="mt-2 text-sm text-red-100/80">Не удалось загрузить подборки</p>
      <p class="mt-1 text-xs text-zinc-500">
        Закройте настройки и попробуйте ещё раз.
      </p>
    </div>
    <div
      v-else-if="loading"
      class="flex gap-2 overflow-hidden md:grid md:grid-cols-3"
    >
      <span
        v-for="index in 6"
        :key="index"
        class="block min-h-24 w-40 shrink-0 animate-pulse rounded-2xl bg-white/5 md:w-auto"
      />
    </div>
    <div v-else-if="sections.length" class="space-y-4 md:space-y-6">
      <section
        v-for="section in sections"
        :key="section.category"
        class="rounded-2xl border border-white/[0.07] bg-black/10 p-2.5 md:border-0 md:bg-transparent md:p-0"
      >
        <div class="flex min-h-9 items-center justify-between gap-3 md:mb-2.5">
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-2 text-left md:pointer-events-none"
            :class="hasMultipleSections ? '' : 'pointer-events-none'"
            :aria-expanded="isSectionOpen(section.category)"
            :aria-controls="`film-group-section-${section.category}`"
            @click="toggleSection(section.category)"
          >
            <icon
              v-if="hasMultipleSections"
              name="lucide:chevron-right"
              class="size-4 shrink-0 text-zinc-500 transition-transform md:hidden"
              :class="isSectionOpen(section.category) ? 'rotate-90' : ''"
            />
            <h4 class="truncate text-xs font-medium text-zinc-300">
              {{ section.label }}
            </h4>
            <span
              v-if="selectedCountFor(section.category)"
              class="shrink-0 rounded-full bg-amber-300/10 px-2 py-0.5 text-[10px] text-amber-200"
            >
              {{ selectedCountFor(section.category) }} выбрано
            </span>
          </button>
          <div class="flex shrink-0 items-center gap-2">
            <button
              v-if="isSectionOpen(section.category) && section.items.length > 2"
              type="button"
              class="min-h-8 rounded-lg px-2 text-[10px] text-zinc-400 transition hover:bg-white/5 hover:text-white md:hidden"
              @click="toggleLayout(section.category)"
            >
              {{ expandedLayouts.has(section.category) ? 'В ленту' : 'Все' }}
            </button>
            <span class="text-[10px] text-zinc-600">
              {{ section.items.length }}
            </span>
          </div>
        </div>
        <div
          :id="`film-group-section-${section.category}`"
          class="mt-2 gap-2 md:mt-0 md:grid md:grid-cols-3 md:overflow-visible md:pb-0"
          :class="
            !isSectionOpen(section.category)
              ? 'hidden'
              : expandedLayouts.has(section.category)
                ? 'grid grid-cols-2'
                : 'flex snap-x snap-mandatory overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          "
        >
          <div
            v-for="group in section.items"
            :key="group._id"
            class="group relative isolate flex min-h-24 snap-start flex-col items-start justify-start rounded-2xl border p-2.5 text-left transition hover:-translate-y-0.5 hover:border-white/25 md:w-auto md:shrink"
            :class="[
              expandedLayouts.has(section.category)
                ? 'w-auto min-w-0'
                : 'w-40 shrink-0',
              selectedIds.has(group._id)
                ? filmGroupAccentStyles[group.accent].card
                : 'border-white/10 bg-white/[0.025]',
            ]"
          >
            <button
              type="button"
              class="absolute inset-0 z-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              :aria-label="`Выбрать подборку «${group.name}»`"
              :aria-pressed="selectedIds.has(group._id)"
              @click="toggleGroup(group)"
            />
            <span
              class="pointer-events-none relative z-10 grid size-8 place-items-center rounded-lg"
              :class="filmGroupAccentStyles[group.accent].icon"
            >
              <icon :name="`lucide:${group.icon}`" class="size-4" />
            </span>
            <span
              class="pointer-events-none relative z-30 mt-2 flex w-full min-w-0 items-start gap-1"
            >
              <span
                class="line-clamp-2 min-w-0 flex-1 text-[11px] font-medium leading-4"
                :class="
                  selectedIds.has(group._id) ? 'text-white' : 'text-zinc-300'
                "
              >
                {{ group.name }}
              </span>
              <button
                v-if="group.description && openDescriptionId !== group._id"
                type="button"
                class="pointer-events-auto -mr-1 grid size-5 shrink-0 place-items-center text-zinc-600 transition hover:text-zinc-200"
                :aria-label="`Описание подборки «${group.name}»`"
                :aria-expanded="false"
                :aria-controls="`film-group-description-${group._id}`"
                @click="toggleDescription(group._id)"
              >
                <icon name="lucide:info" class="size-3.5" />
              </button>
            </span>
            <span
              v-if="group.description && openDescriptionId === group._id"
              :id="`film-group-description-${group._id}`"
              class="pointer-events-none absolute inset-px z-30 flex items-center rounded-[calc(1rem-1px)] bg-zinc-950/90 p-2 pr-7 text-[10px] leading-3.5 text-zinc-300 backdrop-blur-sm"
            >
              <span class="line-clamp-5">{{ group.description }}</span>
            </span>
            <button
              v-if="group.description && openDescriptionId === group._id"
              type="button"
              class="absolute right-2 top-2 z-40 grid size-5 place-items-center text-zinc-500 transition hover:text-white"
              :aria-label="`Скрыть описание подборки «${group.name}»`"
              :aria-expanded="true"
              :aria-controls="`film-group-description-${group._id}`"
              @click="toggleDescription(group._id)"
            >
              <icon name="lucide:x" class="size-3.5" />
            </button>
            <span
              v-if="selectedIds.has(group._id)"
              class="pointer-events-none absolute right-2 top-2 z-10 grid size-5 place-items-center rounded-full"
              :class="filmGroupAccentStyles[group.accent].check"
            >
              <icon name="lucide:check" class="size-3" />
            </span>
          </div>
        </div>
      </section>
    </div>
    <div
      v-else
      class="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center"
    >
      <icon name="lucide:search-x" class="mx-auto size-5 text-zinc-600" />
      <p class="mt-2 text-sm text-zinc-400">Подборки не найдены</p>
      <button
        v-if="search"
        type="button"
        class="mt-2 min-h-9 px-3 text-xs text-amber-200"
        @click="search = ''"
      >
        Очистить поиск
      </button>
    </div>
  </div>
</template>
