<script setup lang="ts">
const route = useRoute();
const requestEvent = useRequestEvent();
const roomStore = useRoomStore();
const notificationStore = useNotificationStore();
useSeoMeta({ robots: 'noindex, nofollow' });

if (!route.query.code || route.query?.code?.length !== 6) {
  await multiNavigate('/', requestEvent, true);
}
const code = ref<string>(route.query.code as string);

onMounted(async () => {
  try {
    const room = await roomStore.joinByCode(code.value);
    await navigateTo(`/room/${room._id}`);
  } catch {
    notificationStore.addNotification(
      'Комната недоступна или уже закрыта',
      'warning',
    );
    await navigateTo('/');
  }
});
</script>

<template><span /></template>

<style scoped></style>
