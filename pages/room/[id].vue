<script setup lang="ts">
const route = useRoute();
const roomStore = useRoomStore();
const notificationStore = useNotificationStore();
const roomId = computed(() => route.params.id as string);
const { connected, connectionStarted, connecting, connect } = useRoomRealtime();

const { error } = await useAsyncData(
  `room-${roomId.value}`,
  () => roomStore.ensureRoom(roomId.value),
  { watch: [roomId] },
);

if (error.value) {
  notificationStore.addNotification(
    'Комната недоступна или уже закрыта',
    'warning',
  );
  await navigateTo('/');
}

onMounted(() => connect(roomId.value));
useHead({
  title: computed(() => `Комната ${roomStore.openedRoom?.code ?? ''}`),
});
useSeoMeta({ robots: 'noindex, nofollow' });
</script>

<template>
  <div
    v-if="roomStore.openedRoom"
    class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6"
  >
    <name-check />
    <div
      v-if="connectionStarted && !connected && !connecting"
      role="status"
      aria-live="polite"
      class="mb-4 flex items-center gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/[0.08] px-4 py-3 text-sm text-amber-100"
    >
      <i class="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-300" />
      <p>
        <span class="font-semibold">Нет соединения.</span>
        Пытаемся восстановить…
      </p>
    </div>
    <room-created v-if="roomStore.openedRoom.status === ERoomStatus.created" />
    <room-started v-else />
  </div>
</template>
