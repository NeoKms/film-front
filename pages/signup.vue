<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'sign' });
useSeoMeta({ title: 'Регистрация', robots: 'noindex, nofollow' });
</script>

<template>
  <section class="rounded-[2rem] border border-white/10 bg-zinc-950/75 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
    <p class="text-xs uppercase tracking-widest text-amber-300">Личный профиль</p>
    <h1 class="mt-3 text-3xl font-medium text-white">Создать аккаунт</h1>
    <p class="mt-2 text-sm leading-6 text-zinc-400">Логин и пароль должны содержать минимум шесть символов.</p>
    <auth-sign-up-form class="mt-7" />
    <div class="my-6 flex items-center gap-3 text-xs text-zinc-600"><span class="h-px flex-1 bg-white/10" />или<span class="h-px flex-1 bg-white/10" /></div>
    <auth-continue-with-accounts />
    <p class="mt-6 text-center text-sm text-zinc-500">Уже есть аккаунт? <NuxtLink to="/sign-in" class="text-amber-300">Войти</NuxtLink></p>
  </section>
</template>
