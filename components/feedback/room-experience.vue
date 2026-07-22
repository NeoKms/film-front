<script setup lang="ts">
import type { FeedbackRating } from '~/types';

const props = defineProps<{ roomId: string }>();
const { submitFeedback } = useFeedback();
const rating = ref<FeedbackRating | null>(null);
const message = ref('');
const submitting = ref(false);
const submitted = ref(false);
const hydrated = ref(false);

const options: Array<{
  value: FeedbackRating;
  label: string;
  icon: string;
}> = [
  { value: 'negative', label: 'Не очень', icon: 'lucide:frown' },
  { value: 'neutral', label: 'Нормально', icon: 'lucide:meh' },
  { value: 'positive', label: 'Отлично', icon: 'lucide:heart' },
];

onMounted(() => {
  submitted.value = hasSubmittedRoomFeedback(localStorage, props.roomId);
  hydrated.value = true;
});

const submit = async () => {
  if (!rating.value || submitting.value) return;
  submitting.value = true;
  try {
    await submitFeedback({
      type: 'room_experience',
      rating: rating.value,
      message: message.value.trim() || undefined,
      room_id: props.roomId,
    });
    markRoomFeedbackSubmitted(localStorage, props.roomId);
    submitted.value = true;
  } catch {
    // The transport layer shows the error; preserve the selected values.
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <aside
    v-if="hydrated"
    class="mx-auto mt-10 max-w-xl rounded-3xl border border-white/10 bg-white/[0.025] p-5 text-left sm:p-6"
  >
    <div v-if="submitted" role="status" class="text-center">
      <p class="text-lg font-medium text-white">Спасибо за обратную связь</p>
      <p class="mt-1 text-sm text-zinc-500">
        Она поможет улучшить выбор фильмов.
      </p>
    </div>
    <template v-else>
      <p class="text-center text-lg font-medium text-white">
        Как прошёл выбор?
      </p>
      <p class="mt-1 text-center text-sm text-zinc-500">
        Один короткий ответ — без обязательного комментария.
      </p>
      <div class="mt-4 grid grid-cols-3 gap-2">
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          class="flex min-h-16 flex-col items-center justify-center rounded-2xl border px-2 py-3 text-center text-sm transition"
          :class="
            rating === option.value
              ? 'border-amber-300/70 bg-amber-300/10 text-amber-200'
              : 'border-white/10 bg-black/15 text-zinc-400 hover:border-white/20 hover:text-white'
          "
          :aria-pressed="rating === option.value"
          @click="rating = option.value"
        >
          <icon
            :name="option.icon"
            class="size-4 shrink-0"
            aria-hidden="true"
          />
          <span class="mt-2 block leading-none">{{ option.label }}</span>
        </button>
      </div>
      <form v-if="rating" class="mt-4" @submit.prevent="submit">
        <label class="block text-sm text-zinc-400">
          Хотите что-нибудь добавить?
          <textarea
            v-model="message"
            maxlength="1000"
            rows="3"
            class="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-300/50"
            placeholder="Необязательно"
          />
        </label>
        <design-system-button class="mt-3" :loading="submitting"
          >Отправить отзыв</design-system-button
        >
      </form>
    </template>
  </aside>
</template>
