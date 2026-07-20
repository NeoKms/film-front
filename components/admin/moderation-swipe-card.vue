<script setup lang="ts">
type SwipeFilm = {
  _id: string;
  name: string | null;
  name_en?: string | null;
  poster_url?: string | null;
  description?: string | null;
  rating?: number | null;
  duration?: number | null;
  year?: number | null;
  countryNames?: string[];
  tagNames?: string[];
};

type Direction = 'verify' | 'hide';

const props = defineProps<{
  film: SwipeFilm;
  missingFields: string[];
  busy?: boolean;
  canUndo?: boolean;
}>();
const emit = defineEmits<{
  decide: [direction: Direction];
  details: [];
  skip: [];
  undo: [];
}>();
const card = ref<HTMLElement | null>(null);
const dragX = ref(0);
const dragY = ref(0);
const dragging = ref(false);
const exitDirection = ref<Direction | null>(null);
let pointerId: number | null = null;
let startX = 0;
let startY = 0;
let commitTimer: ReturnType<typeof setTimeout> | null = null;

const threshold = computed(() =>
  Math.max(72, (card.value?.clientWidth ?? 520) * 0.2),
);
const progress = computed(() =>
  Math.min(1, Math.abs(dragX.value) / threshold.value),
);
const intention = computed<Direction | null>(() => {
  if (dragX.value > 16) return 'verify';
  if (dragX.value < -16) return 'hide';
  return null;
});
const cardStyle = computed(() => {
  if (exitDirection.value) {
    const sign = exitDirection.value === 'verify' ? 1 : -1;
    return {
      transform: `translate3d(${sign * 120}vw, ${dragY.value}px, 0) rotate(${sign * 13}deg)`,
      transition: 'transform 200ms cubic-bezier(.3,.8,.2,1)',
    };
  }
  return {
    transform: `translate3d(${dragX.value}px, ${dragY.value * 0.12}px, 0) rotate(${dragX.value / 40}deg)`,
    transition: dragging.value
      ? 'none'
      : 'transform 200ms cubic-bezier(.2,.8,.2,1)',
  };
});

const reset = () => {
  dragX.value = 0;
  dragY.value = 0;
  dragging.value = false;
  exitDirection.value = null;
  pointerId = null;
};
const focusCard = () => nextTick(() => card.value?.focus());
const commit = (direction: Direction) => {
  if (props.busy || exitDirection.value) return;
  exitDirection.value = direction;
  commitTimer = setTimeout(() => emit('decide', direction), 180);
};
const skip = () => {
  if (props.busy || exitDirection.value) return;
  emit('skip');
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
  )
    commit(dragX.value > 0 ? 'verify' : 'hide');
  else {
    dragX.value = 0;
    dragY.value = 0;
  }
};
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    commit('hide');
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    commit('verify');
  } else if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
    event.preventDefault();
    skip();
  }
};

watch(
  () => props.film._id,
  () => {
    if (commitTimer) clearTimeout(commitTimer);
    reset();
    void focusCard();
  },
);
watch(
  () => props.busy,
  (busy) => {
    if (!busy && exitDirection.value) reset();
  },
);
onMounted(focusCard);
onBeforeUnmount(() => {
  if (commitTimer) clearTimeout(commitTimer);
});
</script>

<template>
  <article
    ref="card"
    class="admin-swipe-card"
    :class="{ 'is-busy': busy }"
    :style="cardStyle"
    tabindex="0"
    :aria-label="`${film.name || 'Фильм без названия'}. Стрелка влево — скрыть, вправо — верифицировать, вниз или S — пропустить, вверх — вернуть предыдущий фильм`"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="reset"
    @keydown="onKeydown"
  >
    <div
      class="swipe-stamp swipe-stamp-hide"
      :style="{ opacity: intention === 'hide' ? progress : 0 }"
    >
      Скрыть
    </div>
    <div
      class="swipe-stamp swipe-stamp-verify"
      :style="{ opacity: intention === 'verify' ? progress : 0 }"
    >
      В пул
    </div>

    <div class="admin-swipe-poster">
      <film-poster
        :src="film.poster_url"
        :alt="film.name || 'Фильм без названия'"
        class="h-full w-full"
      />
    </div>
    <div class="admin-swipe-content">
      <div>
        <p class="admin-swipe-original">
          {{ film.name_en || 'Оригинальное название не указано' }}
        </p>
        <h2>{{ film.name || 'Без названия' }}</h2>
        <p class="admin-swipe-meta">
          {{ film.year || 'Год не указан' }}
          <template v-if="film.duration"> · {{ film.duration }} мин.</template>
          <template v-if="film.rating">
            · рейтинг {{ film.rating.toFixed(1) }}</template
          >
        </p>
      </div>

      <div
        class="admin-completeness"
        :class="{ 'is-complete': !missingFields.length }"
      >
        <strong v-if="missingFields.length"
          >Не заполнено: {{ missingFields.length }} из 5</strong
        >
        <strong v-else>Заполнено: 5 из 5</strong>
        <span v-if="missingFields.length"
          >Не заполнено: {{ missingFields.join(', ') }}</span
        >
        <span v-else>Основные поля заполнены</span>
      </div>

      <p class="admin-swipe-description">
        {{ film.description || 'Описание отсутствует.' }}
      </p>

      <dl class="admin-swipe-classification">
        <div>
          <dt>Жанры</dt>
          <dd>
            <span v-for="tag in film.tagNames" :key="tag">{{ tag }}</span>
            <em v-if="!film.tagNames?.length">Не указаны</em>
          </dd>
        </div>
        <div>
          <dt>Страны</dt>
          <dd>
            <span v-for="country in film.countryNames" :key="country">{{
              country
            }}</span>
            <em v-if="!film.countryNames?.length">Не указаны</em>
          </dd>
        </div>
      </dl>

      <button
        type="button"
        class="admin-swipe-details"
        @pointerdown.stop
        @click.stop="emit('details')"
      >
        Подробнее и редактирование
      </button>
    </div>

    <div class="admin-swipe-actions" @pointerdown.stop>
      <button
        type="button"
        class="is-hide"
        :disabled="busy"
        @click="commit('hide')"
      >
        <span>←</span> Скрыть
      </button>
      <button
        type="button"
        class="is-undo"
        :disabled="busy || !canUndo"
        @click="emit('undo')"
      >
        <span>↑</span> Вернуть предыдущий
      </button>
      <button type="button" class="is-skip" :disabled="busy" @click="skip">
        <span>↓ / S</span> Пропустить
      </button>
      <button
        type="button"
        class="is-verify"
        :disabled="busy"
        @click="commit('verify')"
      >
        В пул <span>→</span>
      </button>
    </div>
  </article>
</template>

<style scoped>
.admin-swipe-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(150px, 0.72fr) minmax(0, 1.28fr);
  min-height: 480px;
  overflow: hidden;
  border: 1px solid #454954;
  border-radius: 24px;
  background: #1c1e24;
  box-shadow: 0 24px 70px rgb(0 0 0 / 45%);
  touch-action: pan-y;
  user-select: none;
  will-change: transform;
}
.admin-swipe-card:focus-visible {
  outline: 2px solid #f7c948;
  outline-offset: 5px;
}
.admin-swipe-card.is-busy {
  pointer-events: none;
  opacity: 0.65;
}
.admin-swipe-poster {
  min-height: 390px;
  background: #292c34;
}
.admin-swipe-poster :deep(img) {
  height: 100%;
  object-fit: cover;
}
.admin-swipe-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 18px;
  padding: 28px 28px 96px;
}
.admin-swipe-original {
  color: #a1a1aa;
  font-size: 13px;
}
.admin-swipe-content h2 {
  margin-top: 5px;
  color: #fff;
  font-size: clamp(24px, 3vw, 38px);
  font-weight: 700;
  line-height: 1.1;
}
.admin-swipe-meta {
  margin-top: 10px;
  color: #d4d4d8;
  font-size: 14px;
}
.admin-completeness {
  display: grid;
  gap: 5px;
  padding: 13px 15px;
  border: 1px solid rgb(248 113 113 / 30%);
  border-radius: 12px;
  background: rgb(127 29 29 / 20%);
}
.admin-completeness strong {
  color: #fecaca;
  font-size: 14px;
}
.admin-completeness span {
  color: #fca5a5;
  font-size: 12px;
  line-height: 1.5;
}
.admin-completeness.is-complete {
  border-color: rgb(52 211 153 / 28%);
  background: rgb(6 78 59 / 20%);
}
.admin-completeness.is-complete strong,
.admin-completeness.is-complete span {
  color: #a7f3d0;
}
.admin-swipe-description {
  display: -webkit-box;
  overflow: hidden;
  color: #d4d4d8;
  font-size: 14px;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
}
.admin-swipe-classification {
  display: grid;
  gap: 12px;
}
.admin-swipe-classification > div {
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}
.admin-swipe-classification dt {
  padding-top: 5px;
  color: #a1a1aa;
  font-size: 12px;
}
.admin-swipe-classification dd {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.admin-swipe-classification span,
.admin-swipe-classification em {
  padding: 5px 9px;
  border: 1px solid #454954;
  border-radius: 999px;
  background: #292c34;
  color: #e4e4e7;
  font-size: 11px;
  font-style: normal;
}
.admin-swipe-classification em {
  border-color: rgb(248 113 113 / 30%);
  color: #fca5a5;
}
.admin-swipe-details {
  width: fit-content;
  min-height: 42px;
  padding: 0 15px;
  border: 1px solid #565b67;
  border-radius: 999px;
  color: #fff;
  font-size: 13px;
}
.admin-swipe-actions {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 14px;
  background: linear-gradient(to top, #15161b 75%, transparent);
}
.admin-swipe-actions button {
  min-height: 50px;
  padding: 0 12px;
  border: 1px solid #4b4f59;
  border-radius: 12px;
  background: #292c34;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}
.admin-swipe-actions button span {
  font-size: 16px;
}
.admin-swipe-actions .is-hide {
  border-color: rgb(248 113 113 / 45%);
  color: #fca5a5;
}
.admin-swipe-actions .is-skip {
  color: #d4d4d8;
}
.admin-swipe-actions .is-undo {
  border-color: rgb(247 201 72 / 40%);
  color: #fcd34d;
}
.admin-swipe-actions .is-verify {
  border-color: rgb(52 211 153 / 45%);
  color: #6ee7b7;
}
.swipe-stamp {
  pointer-events: none;
  position: absolute;
  z-index: 4;
  top: 24px;
  padding: 9px 15px;
  border: 3px solid;
  border-radius: 10px;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.swipe-stamp-hide {
  left: 22px;
  rotate: -8deg;
  color: #fca5a5;
}
.swipe-stamp-verify {
  right: 22px;
  rotate: 8deg;
  color: #6ee7b7;
}
@media (max-width: 640px) {
  .admin-swipe-card {
    grid-template-columns: 112px minmax(0, 1fr);
    min-height: 520px;
    border-radius: 18px;
  }
  .admin-swipe-poster {
    min-height: 250px;
  }
  .admin-swipe-content {
    gap: 13px;
    padding: 18px 16px 180px;
  }
  .admin-swipe-content h2 {
    font-size: 23px;
  }
  .admin-swipe-description {
    -webkit-line-clamp: 3;
  }
  .admin-swipe-classification > div {
    grid-template-columns: minmax(0, 1fr);
    gap: 5px;
  }
  .admin-swipe-classification dt {
    padding-top: 0;
  }
  .admin-swipe-actions {
    grid-template-columns: 1fr 1fr;
  }
}
@media (prefers-reduced-motion: reduce) {
  .admin-swipe-card {
    transition-duration: 1ms !important;
  }
}
</style>
