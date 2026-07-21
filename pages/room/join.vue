<script setup lang="ts">
import {
  buildAbsoluteUrl,
  DEFAULT_OG_IMAGE_PATH,
  normalizeSiteUrl,
} from '~/utils/seo';

const route = useRoute();
const requestEvent = useRequestEvent();
const config = useRuntimeConfig();
const roomStore = useRoomStore();
const notificationStore = useNotificationStore();

const rawCode = Array.isArray(route.query.code)
  ? route.query.code[0]
  : route.query.code;
if (typeof rawCode !== 'string' || !/^\d{6}$/.test(rawCode)) {
  await multiNavigate('/', requestEvent, true);
}
const code = ref(rawCode as string);
const pageOrigin = normalizeSiteUrl(
  String(config.public.siteUrl || 'http://localhost:3000'),
);
const inviteUrl = `${pageOrigin}/room/join?code=${encodeURIComponent(code.value)}`;
const imageUrl = buildAbsoluteUrl(pageOrigin, DEFAULT_OG_IMAGE_PATH);
const title = 'Вас приглашают выбрать фильм';
const description = `Присоединяйтесь к комнате Film Together · код ${code.value}`;

useSeoMeta({
  title,
  description,
  robots: 'noindex, nofollow',
  ogTitle: title,
  ogDescription: description,
  ogUrl: inviteUrl,
  ogImage: imageUrl,
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: imageUrl,
});

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
