<script setup lang="ts">
import type { SelectOption } from '~/types';

const props = withDefaults(
  defineProps<{
    options: SelectOption[];
    selectedOptions: SelectOption[];
    isApi?: boolean;
    searchEnabled?: boolean;
    status?: 'error' | 'pending' | 'success' | 'idle';
    ariaLabel?: string;
    dropdownMode?: 'overlay' | 'inline';
  }>(),
  {
    isApi: false,
    searchEnabled: true,
    status: 'idle',
    ariaLabel: undefined,
    dropdownMode: 'overlay',
  },
);
const emit = defineEmits<{
  'update:selectedOptions': [options: SelectOption[]];
  loadMore: [];
  search: [query: string];
}>();
const dropdownOpen = ref(false);
const searchQuery = ref('');
const root = ref<HTMLElement | null>(null);
let searchTimeout: ReturnType<typeof setTimeout> | null = null;
const optionsList = computed(() => {
  const selectedValues = new Set(
    props.selectedOptions.map(({ value }) => value),
  );
  const merged = [
    ...props.selectedOptions,
    ...props.options.filter(({ value }) => !selectedValues.has(value)),
  ];
  if (props.isApi) return searchQuery.value ? props.options : merged;
  return searchQuery.value
    ? merged.filter(({ label }) =>
        label
          .toLocaleLowerCase()
          .includes(searchQuery.value.toLocaleLowerCase()),
      )
    : merged;
});
const selectOption = (option: SelectOption) => {
  const exists = props.selectedOptions.some(
    ({ value }) => value === option.value,
  );
  emit(
    'update:selectedOptions',
    exists
      ? props.selectedOptions.filter(({ value }) => value !== option.value)
      : [...props.selectedOptions, option],
  );
};
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  if (
    props.isApi &&
    props.status === 'success' &&
    target.scrollTop + target.clientHeight >= target.scrollHeight - 80
  )
    emit('loadMore');
};
watch(searchQuery, (query) => {
  if (!props.isApi) return;
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => emit('search', query), 300);
});
const handleOutside = (event: MouseEvent) => {
  if (!root.value?.contains(event.target as Node)) dropdownOpen.value = false;
};
onMounted(() => document.addEventListener('click', handleOutside));
onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutside);
  if (searchTimeout) clearTimeout(searchTimeout);
});
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm outline-none transition focus:border-amber-300"
      :aria-label="ariaLabel"
      :aria-expanded="dropdownOpen"
      @click="dropdownOpen = !dropdownOpen"
    >
      <span v-if="selectedOptions.length" class="line-clamp-2 text-zinc-200">{{
        selectedOptions.map(({ label }) => label).join(', ')
      }}</span
      ><span v-else class="text-zinc-600">Не выбрано</span
      ><span class="shrink-0 text-zinc-500" aria-hidden="true">⌄</span>
    </button>
    <div
      v-if="dropdownOpen"
      data-testid="multiselect-dropdown"
      class="z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#20232c] shadow-2xl"
      :class="dropdownMode === 'overlay' ? 'absolute' : 'relative'"
      @scroll="handleScroll"
    >
      <div v-if="searchEnabled" class="sticky top-0 z-10 bg-[#20232c] p-2">
        <input
          v-model="searchQuery"
          class="min-h-11 w-full rounded-xl border border-white/10 bg-[#151820] px-3 text-sm text-white outline-none focus:border-amber-300"
          placeholder="Поиск…"
        />
      </div>
      <div class="space-y-1 p-2" :class="searchEnabled ? 'pt-0' : ''">
        <button
          v-for="option in optionsList"
          :key="option.value"
          type="button"
          class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-zinc-300 hover:bg-white/5"
          @click="selectOption(option)"
        >
          <span
            class="grid h-5 w-5 shrink-0 place-items-center rounded border"
            :class="
              selectedOptions.some(({ value }) => value === option.value)
                ? 'border-amber-300 bg-amber-300 text-zinc-950'
                : 'border-white/15'
            "
            >{{
              selectedOptions.some(({ value }) => value === option.value)
                ? '✓'
                : ''
            }}</span
          ><span>{{ option.label }}</span>
        </button>
      </div>
      <p
        v-if="status === 'pending'"
        class="p-3 text-center text-xs text-zinc-500"
      >
        Загрузка…
      </p>
      <p
        v-else-if="status === 'error'"
        class="p-3 text-center text-xs text-red-300"
      >
        Не удалось загрузить варианты
      </p>
      <p
        v-else-if="!optionsList.length"
        class="p-3 text-center text-xs text-zinc-500"
      >
        Ничего не найдено
      </p>
    </div>
  </div>
</template>
