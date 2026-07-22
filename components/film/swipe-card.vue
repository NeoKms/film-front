<script setup lang="ts">
import type { IFilmItem } from '~/stores/film';

type Direction = 'select' | 'deselect';

const props = defineProps<{ film: IFilmItem; busy?: boolean }>();
const emit = defineEmits<{ decide: [direction: Direction]; details: [] }>();
const card = ref<HTMLElement | null>(null);
const dragX = ref(0);
const dragY = ref(0);
const dragging = ref(false);
const exitDirection = ref<Direction | null>(null);
const imageFailed = ref(false);
let pointerId: number | null = null;
let startX = 0;
let startY = 0;

const threshold = computed(() =>
  Math.max(72, (card.value?.clientWidth ?? 320) * 0.24),
);
const progress = computed(() =>
  Math.min(1, Math.abs(dragX.value) / threshold.value),
);
const posterAvailable = computed(
  () => !isMissingImageUrl(props.film.poster_url),
);
const intention = computed<Direction | null>(() => {
  if (dragX.value > 16) return 'select';
  if (dragX.value < -16) return 'deselect';
  return null;
});
const cardStyle = computed(() => {
  if (exitDirection.value) {
    const sign = exitDirection.value === 'select' ? 1 : -1;
    return {
      transform: `translate3d(${sign * 120}vw, ${dragY.value}px, 0) rotate(${sign * 18}deg)`,
      transition: 'transform 220ms cubic-bezier(.3,.8,.2,1)',
    };
  }
  return {
    transform: `translate3d(${dragX.value}px, ${dragY.value * 0.18}px, 0) rotate(${dragX.value / 28}deg)`,
    transition: dragging.value
      ? 'none'
      : 'transform 220ms cubic-bezier(.2,.8,.2,1)',
  };
});

const reset = () => {
  dragX.value = 0;
  dragY.value = 0;
  dragging.value = false;
  exitDirection.value = null;
  pointerId = null;
};

const commit = (direction: Direction) => {
  if (props.busy || exitDirection.value) return;
  exitDirection.value = direction;
  emit('decide', direction);
};

const onPointerDown = (event: PointerEvent) => {
  if (props.busy || event.button !== 0) return;
  pointerId = event.pointerId;
  startX = event.clientX;
  startY = event.clientY;
  dragging.value = true;
  card.value?.setPointerCapture(event.pointerId);
};
const onPointerMove = (event: PointerEvent) => {
  if (!dragging.value || pointerId !== event.pointerId) return;
  dragX.value = event.clientX - startX;
  dragY.value = event.clientY - startY;
};
const onPointerUp = (event: PointerEvent) => {
  if (!dragging.value || pointerId !== event.pointerId) return;
  card.value?.releasePointerCapture(event.pointerId);
  dragging.value = false;
  pointerId = null;
  if (
    Math.abs(dragX.value) >= threshold.value &&
    Math.abs(dragX.value) > Math.abs(dragY.value)
  ) {
    commit(dragX.value > 0 ? 'select' : 'deselect');
  } else {
    dragX.value = 0;
    dragY.value = 0;
  }
};
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    commit('deselect');
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    commit('select');
  }
};
const onImageLoad = (event: Event) => {
  if (isRedirectedKinopoiskPlaceholder(event.currentTarget as HTMLImageElement))
    imageFailed.value = true;
};

watch(
  () => props.film._id,
  () => {
    imageFailed.value = false;
    reset();
  },
);
watch(
  () => props.busy,
  (busy) => {
    if (!busy && exitDirection.value) reset();
  },
);

defineExpose({ swipe: commit });
</script>

<template>
  <article
    ref="card"
    class="relative h-full w-full select-none overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-900 shadow-2xl shadow-black/50 will-change-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
    :style="cardStyle"
    tabindex="0"
    :aria-label="`${film.name}. Свайп влево — пропустить, вправо — выбрать`"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="reset"
    @keydown="onKeydown"
  >
    <img
      v-if="posterAvailable && !imageFailed"
      :src="film.poster_url!"
      :alt="film.name"
      draggable="false"
      class="pointer-events-none h-full w-full object-cover"
      @load="onImageLoad"
      @error="imageFailed = true"
    />
    <img
      v-else
      src="/images/placeholders/film-poster.webp"
      :alt="film.name"
      draggable="false"
      class="pointer-events-none h-full w-full object-cover"
    />
    <div
      class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/5 to-black/15"
    />

    <div
      class="pointer-events-none absolute right-5 top-5 rotate-[8deg] rounded-xl border-2 border-red-300 px-4 py-2 text-lg font-black uppercase tracking-wider text-red-200 transition-opacity"
      :style="{ opacity: intention === 'deselect' ? progress : 0 }"
    >
      Мимо
    </div>
    <div
      class="pointer-events-none absolute left-5 top-5 rotate-[-8deg] rounded-xl border-2 border-emerald-300 px-4 py-2 text-lg font-black uppercase tracking-wider text-emerald-200 transition-opacity"
      :style="{ opacity: intention === 'select' ? progress : 0 }"
    >
      Берём
    </div>

    <div class="absolute inset-x-0 bottom-0 p-5 sm:p-7">
      <div class="pointer-events-none mb-3 flex flex-wrap gap-2 text-xs">
        <span
          v-if="film.rating"
          class="rounded-full bg-amber-300 px-2.5 py-1 font-bold text-zinc-950"
          >Рейтинг {{ film.rating.toFixed(1) }}</span
        >
      </div>
      <h1
        class="pointer-events-none text-2xl font-semibold leading-tight text-white sm:text-3xl"
      >
        {{ film.name }}
      </h1>
      <p class="pointer-events-none mt-2 line-clamp-2 text-sm text-zinc-300">
        {{ film.year
        }}<template v-if="film.duration"> · {{ film.duration }} мин</template
        ><template v-if="film.tag_names?.length">
          · {{ film.tag_names.join(', ') }}</template
        >
      </p>
      <button
        type="button"
        class="mt-4 min-h-11 rounded-full bg-black/45 px-4 text-sm font-medium text-white backdrop-blur transition hover:bg-black/65"
        @pointerdown.stop
        @click.stop="emit('details')"
      >
        Подробнее
      </button>
    </div>
  </article>
</template>

<style scoped>
article {
  touch-action: pan-y;
}
@media (prefers-reduced-motion: reduce) {
  article {
    transition-duration: 1ms !important;
  }
}
</style>
