<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';

const userStore = useUserStore();
const roomStore = useRoomStore();
const authStore = useAuthStore();
const schema = toTypedSchema(
  z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Минимум 2 символа')
      .max(40, 'Максимум 40 символов'),
  }),
);
const { defineField, errors, handleSubmit, isSubmitting } = useForm({
  validationSchema: schema,
});
const isModalOpen = computed(() =>
  Boolean(userStore.profile && !userStore.profile.name?.trim()),
);
const [name, nameAttrs] = defineField('name');
const onSubmit = handleSubmit(async (values) => {
  await authStore.recordPrivacyConsent();
  await userStore.updateProfile({ name: values.name.trim() });
  if (roomStore.openedRoom) await roomStore.openRoom(roomStore.openedRoom._id);
});
</script>

<template>
  <design-system-modal
    :is-open="isModalOpen"
    :closable="false"
    title="Как вас называть?"
  >
    <p class="mb-5 text-sm leading-6 text-zinc-400">
      Имя увидят только участники комнаты. Регистрация не нужна.
    </p>
    <form class="space-y-4" @submit.prevent="onSubmit">
      <design-system-input
        v-model="name"
        v-bind="nameAttrs"
        :error="errors.name"
        placeholder="Ваше имя"
        :disabled="isSubmitting"
        autofocus
      />
      <design-system-button :disabled="isSubmitting" :loading="isSubmitting"
        >Продолжить</design-system-button
      >
      <p class="text-center text-[11px] leading-4 text-zinc-500">
        Нажимая «Продолжить», вы принимаете
        <NuxtLink to="/legal/terms" target="_blank" class="underline"
          >пользовательское соглашение</NuxtLink
        >
        и соглашаетесь на обработку введённого обозначения и технических данных
        в соответствии с
        <NuxtLink to="/legal/privacy" target="_blank" class="underline"
          >политикой обработки данных</NuxtLink
        >.
      </p>
    </form>
  </design-system-modal>
</template>
