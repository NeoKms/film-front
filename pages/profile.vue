<script setup lang="ts">
import { EAuthProvider } from '~/types';

definePageMeta({ middleware: 'account' });

const authStore = useAuthStore();
const userStore = useUserStore();
const notificationStore = useNotificationStore();
const name = ref(userStore.profile?.name ?? '');
const saving = ref(false);
const deleting = ref(false);
const showDeleteConfirm = ref(false);
const activeSection = ref<'overview' | 'history' | 'settings'>('overview');
const passwordForm = reactive({
  current: '',
  next: '',
  confirmation: '',
});
const passwordSaving = ref(false);
const passwordError = ref('');
const repeatingRoomId = ref<string | null>(null);
const isGoogleAccount = computed(
  () => userStore.profile?.auth_provider === EAuthProvider.google,
);
const passwordValidationError = computed(() => {
  if (!passwordForm.current || !passwordForm.next || !passwordForm.confirmation)
    return '';
  if (passwordForm.current.length < 6)
    return 'Текущий пароль должен содержать минимум 6 символов.';
  if (passwordForm.next.length < 6)
    return 'Новый пароль должен содержать минимум 6 символов.';
  if (passwordForm.next === passwordForm.current)
    return 'Новый пароль должен отличаться от текущего.';
  if (passwordForm.next !== passwordForm.confirmation)
    return 'Новые пароли не совпадают.';
  return '';
});
const canChangePassword = computed(
  () =>
    Boolean(
      passwordForm.current &&
        passwordForm.next &&
        passwordForm.confirmation,
    ) &&
    !passwordValidationError.value &&
    !passwordSaving.value,
);

const { data: rooms, status: roomsStatus } = await useAsyncData(
  'profile-room-history',
  () => userStore.getRoomHistory(),
);

const roomStatusLabel = (status: ERoomStatus) =>
  ({
    [ERoomStatus.created]: 'Ожидает старта',
    [ERoomStatus.started]: 'Идёт выбор',
    [ERoomStatus.closed]: 'Завершена',
  })[status];

const saveName = async () => {
  const value = name.value.trim();
  if (value.length < 2 || saving.value) return;
  saving.value = true;
  try {
    await userStore.updateProfile({ name: value });
    name.value = userStore.profile?.name ?? value;
    notificationStore.addNotification('Имя обновлено', 'success');
  } finally {
    saving.value = false;
  }
};

const deleteAccount = async () => {
  deleting.value = true;
  try {
    await authStore.deleteAccount();
  } finally {
    deleting.value = false;
  }
};

const changePassword = async () => {
  if (!canChangePassword.value || isGoogleAccount.value) return;
  passwordSaving.value = true;
  passwordError.value = '';
  try {
    await userStore.changePassword({
      current_password: passwordForm.current,
      new_password: passwordForm.next,
    });
    passwordForm.current = '';
    passwordForm.next = '';
    passwordForm.confirmation = '';
    notificationStore.addNotification(
      'Пароль изменён. При следующем входе используйте новый пароль.',
      'success',
    );
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } }).response
      ?.status;
    passwordError.value =
      status === 401
        ? 'Текущий пароль указан неверно.'
        : status === 403
          ? 'Для этого аккаунта смена пароля недоступна.'
          : 'Не удалось изменить пароль. Попробуйте ещё раз.';
  } finally {
    passwordSaving.value = false;
  }
};

const repeatRoom = async (roomId: string) => {
  repeatingRoomId.value = roomId;
  try {
    const room = await useRoomStore().repeatRoom(roomId);
    await navigateTo(`/room/${room._id}`);
  } finally {
    repeatingRoomId.value = null;
  }
};

watch(passwordForm, () => {
  passwordError.value = '';
});

useHead({ title: 'Профиль' });
useSeoMeta({ robots: 'noindex, nofollow' });
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
    <section
      class="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-amber-300/[0.12] via-white/[0.04] to-transparent p-5 sm:p-8"
    >
      <div class="flex items-center gap-4 sm:gap-6">
        <span
          class="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-amber-300 text-2xl font-semibold text-zinc-950 sm:h-20 sm:w-20"
          >{{ userStore.profile?.name?.slice(0, 1).toUpperCase() || 'Я' }}</span
        >
        <div class="min-w-0">
          <p
            class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300"
          >
            Личный кабинет
          </p>
          <h1
            class="mt-2 truncate text-3xl font-semibold text-white sm:text-4xl"
          >
            {{ userStore.profile?.name }}
          </h1>
          <p class="mt-1 truncate text-sm text-zinc-400">
            {{ userStore.profile?.login }}
          </p>
        </div>
      </div>
    </section>

    <nav
      class="mt-5 flex gap-2 overflow-x-auto pb-1"
      aria-label="Разделы личного кабинета"
    >
      <button
        v-for="item in [
          { id: 'overview', label: 'Обзор' },
          { id: 'history', label: 'История' },
          { id: 'settings', label: 'Настройки' },
        ] as const"
        :key="item.id"
        type="button"
        class="min-h-11 shrink-0 rounded-xl border px-4 text-sm transition"
        :class="
          activeSection === item.id
            ? 'border-amber-300/40 bg-amber-300/10 text-amber-200'
            : 'border-white/10 text-zinc-400 hover:text-white'
        "
        @click="activeSection = item.id"
      >
        {{ item.label }}
      </button>
    </nav>

    <section v-if="activeSection === 'overview'" class="mt-6">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          class="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-white/20"
          @click="activeSection = 'history'"
        >
          <span class="text-3xl font-semibold text-white">{{
            rooms?.length ?? '—'
          }}</span
          ><strong class="mt-6 block text-sm text-white">История комнат</strong
          ><span class="mt-1 block text-xs text-zinc-500"
            >Совпадения и прошлые выборы</span
          >
        </button>
        <div
          class="rounded-2xl border border-white/10 bg-white/[0.025] p-5 opacity-75"
        >
          <span
            class="rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-500"
            >Скоро</span
          ><strong class="mt-10 block text-sm text-white"
            >Уже просмотренное</strong
          ><span class="mt-1 block text-xs text-zinc-500"
            >Не предлагать знакомые фильмы</span
          >
        </div>
        <div
          class="rounded-2xl border border-white/10 bg-white/[0.025] p-5 opacity-75"
        >
          <span
            class="rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-500"
            >Скоро</span
          ><strong class="mt-10 block text-sm text-white">Чёрный список</strong
          ><span class="mt-1 block text-xs text-zinc-500"
            >Скрытые фильмы и категории</span
          >
        </div>
        <button
          type="button"
          class="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-white/20"
          @click="activeSection = 'settings'"
        >
          <span class="text-2xl text-amber-300">⚙</span
          ><strong class="mt-7 block text-sm text-white"
            >Настройки аккаунта</strong
          ><span class="mt-1 block text-xs text-zinc-500"
            >Имя, безопасность и удаление</span
          >
        </button>
      </div>
      <div class="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <p class="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Что даёт аккаунт
        </p>
        <h2 class="mt-2 text-2xl font-medium text-white">
          Возвращайтесь к своим выборам
        </h2>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Аккаунт сохраняет историю комнат и выбранные фильмы, чтобы результат
          не потерялся после завершения вечера. Здесь же можно изменить имя,
          настроить безопасность и управлять данными аккаунта.
        </p>
      </div>
    </section>

    <section v-else-if="activeSection === 'history'" class="mt-7 min-w-0">
      <div class="flex items-end justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Ваши комнаты
          </p>
          <h2 class="mt-1 text-2xl font-medium text-white">История выбора</h2>
        </div>
        <span v-if="rooms" class="text-sm text-zinc-500">{{
          rooms.length
        }}</span>
      </div>
      <div
        v-if="roomsStatus === 'pending'"
        class="grid min-h-48 place-items-center"
      >
        <design-system-loading />
      </div>
      <div v-else-if="rooms?.length" class="mt-5 grid gap-3">
        <article
          v-for="room in rooms"
          :key="room._id"
          class="grid grid-cols-[1fr_auto] gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.06] sm:p-5"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-sm tracking-wider text-amber-300">{{
                room.code
              }}</span
              ><span
                class="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-zinc-400"
                >{{ roomStatusLabel(room.status) }}</span
              >
            </div>
            <p class="mt-2 text-sm text-zinc-500">
              {{ room.participants.length }} участн. ·
              {{ new Date(room.created_at).toLocaleDateString('ru-RU') }}
            </p>
            <div class="mt-3 flex flex-wrap gap-3">
              <NuxtLink :to="`/room/${room._id}`" class="text-sm text-amber-300">Открыть комнату</NuxtLink>
              <button v-if="room.status === ERoomStatus.closed && room.created_by._id === userStore.profile?._id" type="button" class="text-sm text-zinc-300 disabled:opacity-50" :disabled="repeatingRoomId === room._id" @click="repeatRoom(room._id)">{{ repeatingRoomId === room._id ? 'Повторяем…' : 'Повторить с этими фильтрами' }}</button>
            </div>
          </div>
          <div class="flex -space-x-3">
            <film-poster
              v-for="film in room.matched_films.slice(0, 3)"
              :key="film._id"
              :src="film.poster_url"
              :alt="film.name"
              class="aspect-[2/3] w-10 rounded-lg border-2 border-[#111318]"
            />
          </div>
        </article>
      </div>
      <div
        v-else
        class="mt-5 rounded-3xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-500"
      >
        История комнат появится после первого совместного выбора.
      </div>
    </section>

    <section
      v-else
      class="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]"
    >
      <div
        class="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"
      >
        <p class="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Основные данные
        </p>
        <h2 class="mt-1 text-2xl font-medium text-white">Профиль</h2>
        <label class="mt-6 block text-sm font-medium text-zinc-200"
          >Имя<input
            v-model="name"
            maxlength="40"
            class="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-black/25 px-4 text-white outline-none transition focus:border-amber-300"
            @keyup.enter="saveName"
          ></label>
        <p class="mt-4 text-xs text-zinc-500">Логин</p>
        <p class="mt-1 break-all text-sm text-zinc-300">
          {{ userStore.profile?.login }}
        </p>
        <design-system-button
          class="mt-6 max-w-xs"
          :loading="saving"
          :disabled="
            name.trim().length < 2 || name.trim() === userStore.profile?.name
          "
          @click="saveName"
          >Сохранить имя</design-system-button
        >
      </div>
      <aside class="space-y-4">
        <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p class="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Безопасность
          </p>
          <h3 class="mt-1 text-xl font-medium text-white">Смена пароля</h3>
          <template v-if="isGoogleAccount">
            <p class="mt-4 text-sm leading-6 text-zinc-400">
              Вы входите через Google. Пароль этого аккаунта управляется в
              настройках Google.
            </p>
          </template>
          <form v-else class="mt-5 space-y-4" @submit.prevent="changePassword">
            <label class="block text-sm text-zinc-300"
              >Текущий пароль<input
                v-model="passwordForm.current"
                type="password"
                minlength="6"
                autocomplete="current-password"
                class="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-black/25 px-4 text-white outline-none transition focus:border-amber-300"
            ></label>
            <label class="block text-sm text-zinc-300"
              >Новый пароль<input
                v-model="passwordForm.next"
                type="password"
                minlength="6"
                autocomplete="new-password"
                class="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-black/25 px-4 text-white outline-none transition focus:border-amber-300"
            ></label>
            <label class="block text-sm text-zinc-300"
              >Повторите новый пароль<input
                v-model="passwordForm.confirmation"
                type="password"
                minlength="6"
                autocomplete="new-password"
                class="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-black/25 px-4 text-white outline-none transition focus:border-amber-300"
            ></label>
            <p
              v-if="passwordError || passwordValidationError"
              class="text-xs leading-5 text-red-300"
              role="alert"
            >
              {{ passwordError || passwordValidationError }}
            </p>
            <design-system-button
              :loading="passwordSaving"
              :disabled="!canChangePassword"
              >Изменить пароль</design-system-button
            >
          </form>
        </div>
        <div class="rounded-2xl border border-red-400/15 bg-red-400/[0.04] p-5">
          <h3 class="text-sm font-medium text-red-200">Удаление аккаунта</h3>
          <p class="mt-2 text-xs leading-5 text-zinc-500">
            Отключает вход. История комнат останется обезличенной.
          </p>
          <button
            type="button"
            class="mt-4 min-h-10 text-sm text-red-300 transition hover:text-red-200"
            @click="showDeleteConfirm = true"
          >
            Удалить аккаунт
          </button>
        </div>
      </aside>
    </section>

    <design-system-modal
      v-model:is-open="showDeleteConfirm"
      title="Удалить аккаунт?"
    >
      <p class="text-sm leading-6 text-zinc-400">
        Аккаунт будет отключён, войти в него снова не получится. История комнат
        останется в обезличенных данных системы.
      </p>
      <div class="mt-6 grid gap-3 sm:grid-cols-2">
        <design-system-button
          variant="secondary"
          @click="showDeleteConfirm = false"
          >Отмена</design-system-button
        ><design-system-button
          variant="danger"
          :loading="deleting"
          @click="deleteAccount"
          >Удалить аккаунт</design-system-button
        >
      </div>
    </design-system-modal>
  </main>
</template>
