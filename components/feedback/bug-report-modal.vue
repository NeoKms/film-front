<script setup lang="ts">
const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ 'update:isOpen': [value: boolean] }>();
const route = useRoute();
const notificationStore = useNotificationStore();
const { submitFeedback } = useFeedback();
const message = ref('');
const submitting = ref(false);

const relatedRoomId = computed(() => {
  if (!route.path.startsWith('/room/')) return undefined;
  return typeof route.params.id === 'string' ? route.params.id : undefined;
});

const close = () => emit('update:isOpen', false);

const submit = async () => {
  const normalizedMessage = message.value.trim();
  if (normalizedMessage.length < 10 || submitting.value) return;
  submitting.value = true;
  try {
    await submitFeedback({
      type: 'bug_report',
      message: normalizedMessage,
      room_id: relatedRoomId.value,
    });
    message.value = '';
    close();
    notificationStore.addNotification(
      'Спасибо! Сообщение об ошибке отправлено',
      'success',
    );
  } catch {
    // The transport layer shows the error; keep the text for a retry.
  } finally {
    submitting.value = false;
  }
};

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen && !submitting.value) message.value = '';
  },
);
</script>

<template>
  <design-system-modal
    :is-open="isOpen"
    title="Сообщить об ошибке"
    @update:is-open="emit('update:isOpen', $event)"
  >
    <form @submit.prevent="submit">
      <p class="text-sm leading-6 text-zinc-400">
        Коротко опишите, что произошло. Страница и информация о браузере
        добавятся автоматически.
      </p>
      <label class="mt-5 block text-sm font-medium text-zinc-200">
        Что произошло?
        <textarea
          v-model="message"
          autofocus
          required
          minlength="10"
          maxlength="2000"
          rows="6"
          class="mt-2 w-full resize-y rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-300/60"
          placeholder="Например: после нажатия кнопки список фильмов не обновился…"
        />
      </label>
      <p class="mt-2 text-right text-xs text-zinc-600">
        {{ message.length }}/2000
      </p>
      <div class="mt-5 grid gap-3 sm:grid-cols-2">
        <design-system-button type="button" variant="secondary" @click="close"
          >Отмена</design-system-button
        >
        <design-system-button
          :loading="submitting"
          :disabled="message.trim().length < 10"
          >Отправить</design-system-button
        >
      </div>
    </form>
  </design-system-modal>
</template>
