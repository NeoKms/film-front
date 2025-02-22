<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';

const authStore = useAuthStore();
const schema = toTypedSchema(z.object({ login: z.string().min(6, 'Минимум 6 символов'), password: z.string().min(6, 'Минимум 6 символов') }));
const { defineField, errors, handleSubmit, isSubmitting } = useForm({ validationSchema: schema });
const [login, loginAttrs] = defineField('login');
const [password, passwordAttrs] = defineField('password');
const error = ref('');
const onSubmit = handleSubmit(async (values) => {
  error.value = '';
  try { await authStore.signInByLogin(values); } catch { error.value = 'Неверный логин или пароль'; }
});
</script>

<template>
  <form class="space-y-4" @submit.prevent="onSubmit">
    <design-system-input v-model="login" v-bind="loginAttrs" :error="errors.login" placeholder="Логин" autocomplete="username" />
    <design-system-input v-model="password" v-bind="passwordAttrs" :error="errors.password" placeholder="Пароль" type="password" autocomplete="current-password" />
    <p v-if="error" class="text-sm text-red-300">{{ error }}</p>
    <design-system-button :disabled="isSubmitting" :loading="isSubmitting">Войти</design-system-button>
  </form>
</template>
