<script setup lang="ts">
const route = useRoute();
const event = useRequestEvent();
const roomStore = useRoomStore();
useSeoMeta({ robots: 'noindex, nofollow' });

if (!route.query.code || route.query?.code?.length !== 6) {
  await multiNavigate('/', event, true);
}
const code = ref<string>(route.query.code as string);

const { error, data } = await useAsyncData(
  'openRoom',
  async () => roomStore.joinByCode(code.value),
  {
    watch: [code],
  },
);
if (data.value) {
  await navigateTo(`/room/${data.value._id}`);
} else if (error.value) {
  await multiNavigate('/', event, true);
}
</script>

<template><span /></template>

<style scoped></style>
