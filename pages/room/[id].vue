<script setup lang="ts">
const route = useRoute();
const roomStore = useRoomStore();
const notificationStore = useNotificationStore();
const roomId = computed(() => route.params.id as string);
const { connected, connect } = useRoomRealtime();

const { error } = await useAsyncData(
  `room-${roomId.value}`,
  () => roomStore.ensureRoom(roomId.value),
  { watch: [roomId] },
);

if (error.value) {
  notificationStore.addNotification('Комната недоступна или уже закрыта', 'warning');
  await navigateTo('/');
}

onMounted(() => connect(roomId.value));
useHead({ title: computed(() => `Комната ${roomStore.openedRoom?.code ?? ''}`) });
useSeoMeta({ robots: 'noindex, nofollow' });
</script>

<template>
  <div v-if="roomStore.openedRoom" class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
    <name-check />
    <div class="mb-5 flex items-center justify-between text-xs text-zinc-500">
      <span>Комната {{ roomStore.openedRoom.code }}</span>
      <span class="flex items-center gap-2"><i class="h-2 w-2 rounded-full" :class="connected ? 'bg-emerald-400' : 'bg-zinc-600'" />{{ connected ? 'live' : 'offline' }}</span>
    </div>
    <room-created v-if="roomStore.openedRoom.status === ERoomStatus.created" />
    <room-started v-else />
  </div>
</template>
