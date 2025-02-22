<script setup lang="ts">
import QRCode from 'qrcode';
import type { IFilmFilter } from '~/stores/film';
import type { RoomParticipant } from '~/stores/room';

const roomStore = useRoomStore();
const notificationStore = useNotificationStore();
const userStore = useUserStore();
const filmStore = useFilmStore();
const { track } = useProductAnalytics();
const room = computed(() => roomStore.openedRoom!);
const showQR = ref(false);
const showSettings = ref(false);
const showCloseConfirm = ref(false);
const participantToKick = ref<RoomParticipant | null>(null);
const qrCodeUrl = ref('');
const loading = ref(false);
const kicking = ref(false);
const shareLink = computed(() =>
  import.meta.client
    ? `${window.location.origin}/room/join?code=${room.value.code}`
    : '',
);
const isOwner = computed(
  () => room.value.created_by._id === userStore.profile?._id,
);
const filters = computed(() => room.value.film_filter);
const filterSummary = computed(() => {
  const result: string[] = [];
  const value = room.value.film_filter;
  if (value.tags?.length) result.push(`${value.tags.length} жанр.`);
  if (value.exclude_tags?.length)
    result.push(`Без ${value.exclude_tags.length} жанр.`);
  if (value.countries?.length) result.push(`${value.countries.length} стран.`);
  if (value.exclude_countries?.length)
    result.push(`Без ${value.exclude_countries.length} стран.`);
  if (value.actors?.length) result.push(`${value.actors.length} участ.`);
  if (value.exclude_actors?.length)
    result.push(`Без ${value.exclude_actors.length} участ.`);
  if (value.year_from || value.year_to)
    result.push(
      `${value.year_from ?? 1960}–${value.year_to ?? new Date().getFullYear()}`,
    );
  if (value.rating_kp_from) result.push(`КП от ${value.rating_kp_from}`);
  return result.length ? result : ['Без ограничений'];
});

const {
  data: totalFilms,
  status: totalStatus,
  refresh,
} = await useAsyncData(
  `room-total-${room.value._id}`,
  () => filmStore.getOneFastFilter(room.value.film_filter),
  { watch: [filters] },
);

const copyLink = async () => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareLink.value);
    } else {
      const input = document.createElement('textarea');
      input.value = shareLink.value;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    notificationStore.addNotification('Ссылка скопирована', 'success');
  } catch {
    notificationStore.addNotification('Не удалось скопировать ссылку', 'error');
  }
};
const shareRoom = async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Выбираем фильм вместе',
        text: `Код комнаты: ${room.value.code}`,
        url: shareLink.value,
      });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  await copyLink();
};
const generateQRCode = async () => {
  qrCodeUrl.value = await QRCode.toDataURL(shareLink.value, {
    width: 480,
    margin: 1,
  });
  showQR.value = true;
};
const saveFilters = async (filmFilter: IFilmFilter) => {
  await roomStore.updateFilters(room.value._id, filmFilter);
  showSettings.value = false;
  await refresh();
  track('filters_saved');
};
const start = async () => {
  loading.value = true;
  try {
    await roomStore.startRoom(room.value._id);
  } finally {
    loading.value = false;
  }
};
const close = async () => {
  showCloseConfirm.value = false;
  loading.value = true;
  try {
    await roomStore.endRoom(room.value._id);
  } finally {
    loading.value = false;
  }
};
const kickParticipant = async () => {
  if (!participantToKick.value || kicking.value) return;
  kicking.value = true;
  try {
    await roomStore.kickParticipant(
      room.value._id,
      participantToKick.value._id,
    );
    notificationStore.addNotification('Участник удалён из комнаты', 'success');
    participantToKick.value = null;
  } finally {
    kicking.value = false;
  }
};
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-[1fr_0.8fr] lg:gap-5">
    <section
      class="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-8"
    >
      <p class="text-sm text-zinc-400">Ждём остальных</p>
      <h1 class="mt-2 text-3xl font-medium text-white">Комната готова</h1>
      <div class="mt-6 grid gap-2 sm:mt-8 sm:grid-cols-2 sm:gap-3">
        <div
          v-for="participant in room.participants"
          :key="participant._id"
          class="flex min-h-14 items-center gap-3 rounded-2xl bg-black/20 p-3 text-zinc-200 sm:p-4"
        >
          <span
            class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-300 font-semibold text-zinc-950"
            >{{ participant.name?.slice(0, 1).toUpperCase() }}</span
          >
          <span class="truncate">{{ participant.name || 'Без имени' }}</span>
          <span
            v-if="participant._id === room.created_by._id"
            class="ml-auto text-[10px] text-zinc-500"
            >организатор</span
          >
          <button
            v-else-if="isOwner"
            type="button"
            class="ml-auto min-h-9 shrink-0 rounded-xl px-2.5 text-xs text-zinc-500 transition hover:bg-red-400/10 hover:text-red-300"
            :aria-label="`Удалить ${participant.name || 'участника'} из комнаты`"
            @click="participantToKick = participant"
          >
            Удалить
          </button>
        </div>
      </div>

      <div class="mt-6 rounded-2xl border border-white/5 bg-black/15 p-4">
        <div class="flex items-center justify-between gap-4">
          <span class="text-xs uppercase tracking-widest text-zinc-600"
            >Фильтры</span
          ><span class="text-sm text-zinc-300">{{
            totalStatus === 'success' ? `${totalFilms} фильмов` : 'Считаем…'
          }}</span>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <span
            v-for="item in filterSummary"
            :key="item"
            class="rounded-full bg-white/5 px-3 py-1.5 text-xs text-zinc-400"
            >{{ item }}</span
          >
        </div>
      </div>

      <div v-if="isOwner" class="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
        <button
          class="min-h-12 rounded-2xl bg-amber-300 px-5 font-semibold text-zinc-950 disabled:opacity-40"
          :disabled="loading || totalStatus !== 'success' || !totalFilms"
          @click="start"
        >
          Начать выбор · {{ totalFilms ?? '…' }}
        </button>
        <button
          class="min-h-12 rounded-2xl border border-white/15 px-5 text-white"
          @click="
            showSettings = true;
            track('filters_open');
          "
        >
          Настроить
        </button>
        <button
          class="min-h-11 text-sm text-zinc-600 hover:text-red-300 sm:col-span-2"
          :disabled="loading"
          @click="showCloseConfirm = true"
        >
          Завершить комнату
        </button>
      </div>
      <p
        v-else
        class="mt-6 rounded-2xl bg-white/[0.03] p-4 text-sm leading-6 text-zinc-500"
      >
        Организатор настраивает подборку и запускает выбор. Экран обновится
        автоматически.
      </p>
    </section>

    <aside
      class="order-first rounded-3xl border border-amber-300/20 bg-amber-300/[0.06] p-5 lg:order-none sm:p-8"
    >
      <p class="text-xs uppercase tracking-widest text-zinc-500">
        Код приглашения
      </p>
      <p
        class="mt-3 font-mono text-4xl tracking-[0.18em] text-amber-300 sm:text-5xl"
      >
        {{ room.code }}
      </p>
      <p class="mt-4 text-sm leading-6 text-zinc-400">
        Отправьте ссылку или покажите QR-код. Войти можно без регистрации.
      </p>
      <div class="mt-5 grid grid-cols-[1fr_auto] gap-3">
        <button
          class="min-h-12 rounded-2xl bg-white px-4 font-medium text-zinc-950"
          @click="shareRoom"
        >
          Поделиться</button
        ><button
          class="min-h-12 rounded-2xl border border-white/15 px-4 text-white"
          aria-label="Показать QR-код"
          @click="generateQRCode"
        >
          QR
        </button>
      </div>
    </aside>

    <design-system-modal v-model:is-open="showQR" title="Войти по QR-коду"
      ><img
        :src="qrCodeUrl"
        alt="QR-код приглашения"
        class="mx-auto w-full max-w-sm rounded-2xl bg-white p-3"
      >
      <p class="mt-4 text-center font-mono tracking-widest text-amber-300">
        {{ room.code }}
      </p></design-system-modal
    >
    <design-system-modal v-model:is-open="showSettings" title="Фильтры комнаты"
      ><room-settings :filters="room.film_filter" @save-filters="saveFilters"
    /></design-system-modal>
    <design-system-modal
      :is-open="Boolean(participantToKick)"
      title="Удалить участника?"
      @update:is-open="
        (open) => {
          if (!open) participantToKick = null;
        }
      "
    >
      <p class="text-sm leading-6 text-zinc-400">
        {{ participantToKick?.name || 'Участник' }} сможет войти снова. После
        третьего удаления вход в эту комнату будет заблокирован.
      </p>
      <div class="mt-6 grid gap-3 sm:grid-cols-2">
        <design-system-button
          variant="secondary"
          :disabled="kicking"
          @click="participantToKick = null"
        >
          Отмена
        </design-system-button>
        <design-system-button
          variant="danger"
          :loading="kicking"
          @click="kickParticipant"
        >
          Удалить
        </design-system-button>
      </div>
    </design-system-modal>
    <design-system-modal
      v-model:is-open="showCloseConfirm"
      title="Завершить комнату?"
      ><p class="text-sm leading-6 text-zinc-400">
        Участники больше не смогут присоединиться или выбирать фильмы.
      </p>
      <div class="mt-6 grid gap-3 sm:grid-cols-2">
        <design-system-button
          variant="secondary"
          @click="showCloseConfirm = false"
          >Отмена</design-system-button
        ><design-system-button variant="danger" @click="close"
          >Завершить комнату</design-system-button
        >
      </div></design-system-modal
    >
  </div>
</template>
