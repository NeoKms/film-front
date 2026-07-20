<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';

const authStore = useAuthStore();
const { track } = useProductAnalytics();
const schema = toTypedSchema(
  z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Минимум 2 символа')
      .max(40, 'Максимум 40 символов'),
    login: z.string().min(6, 'Минимум 6 символов'),
    password: z.string().min(6, 'Минимум 6 символов'),
    privacyAccepted: z
      .boolean()
      .refine(Boolean, 'Нужно согласие на обработку данных'),
  }),
);
const { defineField, errors, handleSubmit, isSubmitting } = useForm({
  validationSchema: schema,
});
const [name, nameAttrs] = defineField('name');
const [login, loginAttrs] = defineField('login');
const [password, passwordAttrs] = defineField('password');
const [privacyAccepted, privacyAcceptedAttrs] = defineField('privacyAccepted');
const error = ref('');
const onSubmit = handleSubmit(async (values) => {
  track('signup_started');
  error.value = '';
  try {
    await authStore.signUpByLogin({
      login: values.login,
      password: values.password,
      name: values.name.trim(),
    });
    track('signup_completed');
  } catch {
    error.value = 'Не удалось создать аккаунт с таким логином';
  }
});
</script>

<template>
  <form class="space-y-4" @submit.prevent="onSubmit">
    <design-system-input
      v-model="name"
      v-bind="nameAttrs"
      :error="errors.name"
      placeholder="Ваше имя"
      autocomplete="name"
    />
    <design-system-input
      v-model="login"
      v-bind="loginAttrs"
      :error="errors.login"
      placeholder="Логин"
      autocomplete="username"
    />
    <design-system-input
      v-model="password"
      v-bind="passwordAttrs"
      :error="errors.password"
      placeholder="Пароль"
      type="password"
      autocomplete="new-password"
    />
    <label
      class="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-zinc-400"
      ><input
        v-model="privacyAccepted"
        v-bind="privacyAcceptedAttrs"
        type="checkbox"
        class="mt-1 accent-amber-300"
      ><span
        >Я отдельно даю согласие на обработку персональных данных для создания и
        использования аккаунта в соответствии с
        <NuxtLink
          to="/legal/privacy"
          target="_blank"
          class="text-amber-300 underline"
          >политикой</NuxtLink
        >.</span
      ></label
    >
    <p v-if="errors.privacyAccepted" class="text-xs text-red-300">
      {{ errors.privacyAccepted }}
    </p>
    <p v-if="error" class="text-sm text-red-300">{{ error }}</p>
    <design-system-button :disabled="isSubmitting" :loading="isSubmitting"
      >Создать аккаунт</design-system-button
    >
    <p class="text-center text-[11px] leading-4 text-zinc-500">
      Нажимая «Создать аккаунт», вы принимаете
      <NuxtLink to="/legal/terms" target="_blank" class="underline"
        >пользовательское соглашение</NuxtLink
      >.
    </p>
  </form>
</template>
