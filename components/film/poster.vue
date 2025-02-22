<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    src?: string | null;
    alt: string;
    variant?: 'film' | 'person';
  }>(),
  { src: null, variant: 'film' },
);
const failed = ref(false);
const usableSource = computed(() => !isMissingImageUrl(props.src));
const fallbackSource = computed(() =>
  props.variant === 'person'
    ? '/images/placeholders/person.webp'
    : '/images/placeholders/film-poster.webp',
);

watch(
  () => props.src,
  () => {
    failed.value = false;
  },
);
const handleLoad = (event: Event) => {
  if (isRedirectedKinopoiskPlaceholder(event.currentTarget as HTMLImageElement))
    failed.value = true;
};
</script>

<template>
  <div
    class="relative overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-950"
  >
    <img
      v-if="usableSource && !failed"
      :src="src!"
      :alt="alt"
      class="h-full w-full object-cover"
      @load="handleLoad"
      @error="failed = true"
    >
    <template v-else>
      <img
        :src="fallbackSource"
        :alt="alt"
        class="h-full min-h-28 w-full object-cover"
      >
      <div
        v-if="variant === 'film'"
        class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8 text-center"
      >
        <p class="line-clamp-2 text-xs text-zinc-300">{{ alt }}</p>
      </div>
    </template>
  </div>
</template>
