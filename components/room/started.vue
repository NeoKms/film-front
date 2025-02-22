<script setup lang="ts">
import type { IFilmItem } from '~/stores/film';

type Direction = 'select' | 'deselect';

const roomStore = useRoomStore();
const route = useRoute();
const userStore = useUserStore();
const notificationStore = useNotificationStore();
const room = computed(() => roomStore.openedRoom!);
const currentFilm = computed(() => roomStore.filmBatch[0]);
const nextFilm = computed(() => roomStore.filmBatch[1]);
const isOwner = computed(
  () => room.value.created_by._id === userStore.profile?._id,
);
const deciding = ref(false);
const showMatches = ref(false);
const showCloseConfirm = ref(false);
const finalizingFilm = ref<IFilmItem | null>(null);
const finalizing = ref(false);
const repeating = ref(false);
const decisionHistory = ref<Array<{ film: IFilmItem; direction: Direction }>>(
  [],
);
const { track } = useProductAnalytics();
const otherMatches = computed(() =>
  roomStore.matchedFilms.filter(
    (film) => film._id !== room.value.final_film?._id,
  ),
);

const loadState = async () => {
  await roomStore.ensureMatchedFilms(room.value._id);
  if (room.value.status === ERoomStatus.started)
    await roomStore.ensureFilmBatch(room.value._id);
  return true;
};
await useAsyncData(`room-selection-${room.value._id}`, loadState);

const decide = async (direction: Direction) => {
  const film = currentFilm.value;
  if (!film || deciding.value) return;
  deciding.value = true;
  try {
    await roomStore.decide(room.value._id, film._id, direction);
    if (!decisionHistory.value.length) track('first_decision');
    decisionHistory.value.push({ film, direction });
    roomStore.filmBatch.shift();
    if (!roomStore.filmBatch.length)
      await roomStore.loadFilmBatch(room.value._id);
  } catch {
    // Transport layer shows the error; keeping the same card is the rollback.
  } finally {
    deciding.value = false;
  }
};

const undo = async () => {
  const previous = decisionHistory.value.pop();
  if (!previous || deciding.value) return;
  deciding.value = true;
  try {
    const inverse = previous.direction === 'select' ? 'deselect' : 'select';
    await roomStore.decide(room.value._id, previous.film._id, inverse);
    await roomStore.loadFilmBatch(room.value._id);
    notificationStore.addNotification('Последний выбор отменён', 'success');
  } catch {
    decisionHistory.value.push(previous);
  } finally {
    deciding.value = false;
  }
};

watch(
  () => roomStore.newMatchFilmId,
  async (filmId) => {
    if (!filmId) return;
    const matches = await roomStore.loadMatchedFilms(room.value._id);
    const match = matches.find((film) => film._id === filmId) ?? matches.at(-1);
    notificationStore.addNotification(
      match
        ? `Это match! «${match.name}» выбрали все участники.`
        : 'Это match! Все участники выбрали один фильм.',
      'success',
      5000,
    );
    roomStore.newMatchFilmId = null;
    track('match_received');
  },
);

const closeRoom = async () => {
  showCloseConfirm.value = false;
  await roomStore.endRoom(room.value._id);
};

const filmDetailsLocation = (filmId: string) => ({
  path: `/film/${filmId}`,
  query: { from: route.fullPath },
});

const chooseFinalFilm = async () => {
  if (!finalizingFilm.value || finalizing.value) return;
  finalizing.value = true;
  try {
    await roomStore.finalizeRoom(room.value._id, finalizingFilm.value._id);
    showMatches.value = false;
    finalizingFilm.value = null;
  } finally {
    finalizing.value = false;
  }
};

const chooseRandom = async () => {
  if (finalizing.value) return;
  const candidates = roomStore.matchedFilms;
  if (!candidates.length) return;
  const film = candidates[Math.floor(Math.random() * candidates.length)];
  if (!film) return;
  finalizing.value = true;
  try {
    await roomStore.finalizeRoom(room.value._id, film._id);
    showMatches.value = false;
  } finally {
    finalizing.value = false;
  }
};

const repeatRoom = async () => {
  repeating.value = true;
  try {
    const repeated = await roomStore.repeatRoom(room.value._id);
    await navigateTo(`/room/${repeated._id}`);
  } finally {
    repeating.value = false;
  }
};

const shareFinalFilm = async () => {
  const film = room.value.final_film;
  if (!film) return;
  const url = new URL(`/share/${film._id}`, window.location.origin).toString();
  const text = `«${film.name}» (${film.year}). Мы выбрали этот фильм в Film Together.`;
  const usedNativeShare = typeof navigator.share === 'function';
  try {
    if (usedNativeShare) await navigator.share({ title: film.name, text, url });
    else await navigator.clipboard.writeText(`${text} ${url}`);
    notificationStore.addNotification(
      usedNativeShare ? 'Фильм отправлен' : 'Текст и ссылка скопированы',
      'success',
    );
    track('result_shared');
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      notificationStore.addNotification(
        'Не удалось поделиться фильмом',
        'error',
      );
    }
  }
};
</script>

<template>
  <section
    v-if="room.status === ERoomStatus.closed"
    class="mx-auto max-w-4xl py-4 text-center sm:py-8"
  >
    <p class="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
      Комната завершена
    </p>
    <template v-if="room.final_film">
      <h1 class="mt-3 text-3xl font-medium text-white sm:text-4xl">
        Фильм выбран
      </h1>
      <div
        class="mx-auto mt-8 grid max-w-xl gap-5 rounded-[2rem] border border-amber-300/30 bg-amber-300/[0.07] p-5 text-left sm:grid-cols-[9rem_1fr] sm:items-center"
      >
        <film-poster
          :src="room.final_film.poster_url"
          :alt="room.final_film.name"
          class="mx-auto aspect-[2/3] w-36 rounded-2xl sm:w-full"
        />
        <div>
          <p
            class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300"
          >
            Итог комнаты
          </p>
          <h2 class="mt-2 text-2xl font-medium text-white">
            {{ room.final_film.name }}
          </h2>
          <p class="mt-1 text-sm text-zinc-400">{{ room.final_film.year }}</p>
          <button
            type="button"
            class="mt-5 min-h-11 rounded-xl bg-amber-300 px-4 text-sm font-semibold text-zinc-950"
            @click="shareFinalFilm"
          >
            Поделиться фильмом
          </button>
        </div>
      </div>
    </template>
    <template v-else>
      <h1 class="mt-3 text-3xl font-medium text-white sm:text-4xl">
        Ваши совпадения
      </h1>
      <p class="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
        Комната завершена без итогового фильма. Совпадения доступны только для
        просмотра.
      </p>
    </template>
    <h2
      v-if="otherMatches.length"
      class="mt-10 text-left text-xl font-medium text-white"
    >
      {{ room.final_film ? 'Другие совпадения' : 'Все совпадения' }}
    </h2>
    <div
      v-if="otherMatches.length"
      class="mt-4 grid grid-cols-2 gap-3 text-left sm:grid-cols-3 sm:gap-5 md:grid-cols-4"
    >
      <NuxtLink
        v-for="film in otherMatches"
        :key="film._id"
        :to="filmDetailsLocation(film._id)"
        class="group"
      >
        <film-poster
          :src="film.poster_url"
          :alt="film.name"
          class="aspect-[2/3] w-full rounded-2xl"
        />
        <p class="mt-2 line-clamp-2 text-sm font-medium text-white">
          {{ film.name }}
        </p>
        <p class="mt-1 text-xs text-zinc-500">{{ film.year }}</p>
      </NuxtLink>
    </div>
    <div
      v-else-if="!room.final_film"
      class="mx-auto mt-8 max-w-md rounded-3xl border border-dashed border-white/15 p-8"
    >
      <span class="text-4xl" aria-hidden="true">🎞️</span>
      <p class="mt-3 text-zinc-400">Общих фильмов пока нет.</p>
    </div>
    <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
      <design-system-button
        v-if="isOwner"
        :loading="repeating"
        @click="repeatRoom"
        >Повторить с этими фильтрами</design-system-button
      >
      <NuxtLink
        to="/"
        class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 px-6 font-semibold text-white"
        >Создать новую комнату</NuxtLink
      >
    </div>
  </section>

  <section
    v-else
    class="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-6"
  >
    <div class="order-2 mx-auto w-full max-w-[29rem] lg:order-1">
      <div class="relative h-[min(65dvh,42rem)] min-h-[24rem]">
        <div
          v-if="nextFilm"
          class="absolute inset-x-3 inset-y-2 overflow-hidden rounded-[1.75rem] opacity-50"
        >
          <film-poster
            :src="nextFilm.poster_url"
            :alt="nextFilm.name"
            class="h-full w-full"
          />
          <div class="absolute inset-0 bg-black/35" />
        </div>
        <film-swipe-card
          v-if="currentFilm"
          :key="currentFilm._id"
          :film="currentFilm"
          :busy="deciding"
          class="absolute inset-0"
          @decide="decide"
          @details="navigateTo(filmDetailsLocation(currentFilm._id))"
        />
        <div
          v-else-if="roomStore.batchLoading"
          class="absolute inset-0 grid place-items-center rounded-[1.75rem] border border-white/10 bg-white/[0.03]"
        >
          <div class="text-center">
            <design-system-loading />
            <p class="mt-4 text-sm text-zinc-500">Загружаем фильмы…</p>
          </div>
        </div>
        <div
          v-else
          class="absolute inset-0 grid place-items-center rounded-[1.75rem] border border-dashed border-white/15 p-8 text-center"
        >
          <div>
            <span class="text-4xl" aria-hidden="true">🍿</span>
            <p class="mt-4 text-2xl text-white">Карточки закончились</p>
            <p class="mt-2 text-sm leading-6 text-zinc-500">
              Посмотрите совпадения или проверьте, не появились ли новые фильмы.
            </p>
            <button
              type="button"
              class="mt-5 min-h-11 rounded-xl border border-white/15 px-4 text-sm text-white"
              @click="roomStore.loadFilmBatch(room._id)"
            >
              Проверить ещё раз
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="currentFilm"
        class="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-1"
      >
        <button
          type="button"
          class="grid min-h-14 place-items-center rounded-2xl border border-red-300/20 bg-red-400/10 text-2xl text-red-200 transition hover:bg-red-400/20 disabled:opacity-40"
          :disabled="deciding"
          aria-label="Пропустить фильм"
          @click="decide('deselect')"
        >
          ×
        </button>
        <button
          type="button"
          class="min-h-11 px-2 text-xs font-medium text-zinc-500 transition hover:text-white disabled:opacity-30"
          :disabled="!decisionHistory.length || deciding"
          @click="undo"
        >
          ↶ Назад
        </button>
        <button
          type="button"
          class="grid min-h-14 place-items-center rounded-2xl bg-amber-300 text-2xl text-zinc-950 transition hover:bg-amber-200 disabled:opacity-40"
          :disabled="deciding"
          aria-label="Выбрать фильм"
          @click="decide('select')"
        >
          ♥
        </button>
      </div>
      <p class="mt-3 text-center text-[11px] text-zinc-600">
        <span class="hidden sm:inline">Тяните карточку мышью или </span
        >свайпайте влево / вправо
      </p>
    </div>

    <aside
      class="order-1 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 lg:order-2 lg:block lg:h-fit lg:rounded-3xl lg:p-5"
    >
      <div>
        <p class="text-[11px] uppercase tracking-widest text-zinc-600">
          Комната
        </p>
        <p class="mt-0.5 font-mono text-sm tracking-wider text-amber-300">
          {{ room.code }}
        </p>
      </div>
      <p class="hidden text-sm text-zinc-500 lg:mt-4 lg:block">
        {{ room.participants.length }}
        {{ room.participants.length === 1 ? 'участник' : 'участника' }}
      </p>
      <div class="flex gap-2 lg:mt-5 lg:block">
        <button
          type="button"
          :class="[
            'min-h-11 rounded-xl border px-3 text-xs transition lg:w-full lg:px-4 lg:text-sm',
            roomStore.matchedFilms.length
              ? 'border-amber-300 bg-amber-300 font-semibold text-zinc-950 shadow-lg shadow-amber-300/20 hover:bg-amber-200'
              : 'border-white/15 text-white hover:border-white/30',
          ]"
          @click="
            showMatches = true;
            track('matches_opened');
          "
        >
          Matches · {{ roomStore.matchedFilms.length }}
        </button>
      </div>
    </aside>
  </section>

  <design-system-modal v-model:is-open="showMatches" title="Совпадения">
    <p
      v-if="!roomStore.matchedFilms.length"
      class="rounded-2xl border border-dashed border-white/15 p-7 text-center text-sm text-zinc-500"
    >
      Пока общего выбора нет. Продолжайте смотреть фильмы.
    </p>
    <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <article
        v-for="film in roomStore.matchedFilms"
        :key="film._id"
        class="group"
      >
        <NuxtLink :to="filmDetailsLocation(film._id)"
          ><film-poster
            :src="film.poster_url"
            :alt="film.name"
            class="aspect-[2/3] rounded-xl transition group-hover:scale-[1.02]"
          />
          <p class="mt-2 line-clamp-2 text-sm font-medium text-white">
            {{ film.name }}
          </p></NuxtLink
        ><button
          v-if="isOwner"
          type="button"
          class="mt-3 min-h-10 w-full rounded-xl bg-amber-300 px-3 text-xs font-semibold text-zinc-950"
          @click="finalizingFilm = film"
        >
          Выбрать этот фильм
        </button>
      </article>
    </div>
    <div v-if="isOwner" class="mt-6 border-t border-white/10 pt-5">
      <button
        v-if="roomStore.matchedFilms.length"
        type="button"
        class="mb-4 min-h-11 w-full rounded-xl border border-amber-300/30 text-sm text-amber-200 disabled:opacity-50"
        :disabled="finalizing"
        @click="chooseRandom"
      >
        {{ finalizing ? 'Выбираем…' : 'Выбрать случайно' }}
      </button>
      <p class="text-sm leading-6 text-zinc-400">
        Когда выбор закончен, завершите комнату. После этого участники смогут
        только просматривать совпадения.
      </p>
      <design-system-button
        class="mt-4"
        variant="danger"
        @click="
          showMatches = false;
          showCloseConfirm = true;
        "
        >Завершить комнату</design-system-button
      >
    </div>
  </design-system-modal>

  <design-system-modal
    :is-open="Boolean(finalizingFilm)"
    title="Сделать фильм итоговым?"
    @update:is-open="
      (open) => {
        if (!open) finalizingFilm = null;
      }
    "
  >
    <div
      v-if="finalizingFilm"
      class="grid grid-cols-[5rem_1fr] items-center gap-4"
    >
      <film-poster
        :src="finalizingFilm.poster_url"
        :alt="finalizingFilm.name"
        class="aspect-[2/3] rounded-xl"
      />
      <div>
        <p class="font-medium text-white">{{ finalizingFilm.name }}</p>
        <p class="mt-1 text-sm text-zinc-500">{{ finalizingFilm.year }}</p>
      </div>
    </div>
    <p class="mt-5 text-sm leading-6 text-zinc-400">
      Комната автоматически завершится, и этот фильм увидят итогом все
      участники.
    </p>
    <div class="mt-6 grid gap-3 sm:grid-cols-2">
      <design-system-button variant="secondary" @click="finalizingFilm = null"
        >Отмена</design-system-button
      ><design-system-button :loading="finalizing" @click="chooseFinalFilm"
        >Выбрать и завершить</design-system-button
      >
    </div>
  </design-system-modal>

  <design-system-modal
    v-model:is-open="showCloseConfirm"
    title="Завершить комнату?"
  >
    <p class="text-sm leading-6 text-zinc-400">
      Выбор фильмов завершится для всех участников. Вернуться к нему будет
      нельзя, но совпадения останутся доступны.
    </p>
    <div class="mt-6 grid gap-3 sm:grid-cols-2">
      <design-system-button
        variant="secondary"
        @click="showCloseConfirm = false"
        >Продолжить выбор</design-system-button
      ><design-system-button variant="danger" @click="closeRoom"
        >Завершить комнату</design-system-button
      >
    </div>
  </design-system-modal>
</template>
