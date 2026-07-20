<script setup lang="ts">
const authStore = useAuthStore();
const userStore = useUserStore();
</script>

<template>
  <header
    class="sticky top-0 z-30 border-b border-white/10 bg-[#0b0d12]/85 backdrop-blur-xl"
  >
    <div
      class="mx-auto flex h-16 max-w-6xl items-center justify-between px-3 sm:px-6"
    >
      <NuxtLink
        to="/"
        class="shrink-0 text-sm font-semibold uppercase tracking-[0.18em] text-white"
        ><span class="sm:hidden">F<span class="text-amber-300">T</span></span
        ><span class="hidden sm:inline"
          >Film <span class="text-amber-300">Together</span></span
        ></NuxtLink
      >
      <div class="flex items-center gap-2 text-sm sm:gap-4">
        <NuxtLink
          v-if="userStore.profile?.token_id"
          to="/profile"
          class="flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-zinc-300 transition hover:border-white/20 hover:text-white"
          aria-label="Открыть личный кабинет"
        >
          <span
            class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-300 text-xs font-semibold text-zinc-950"
            >{{
              userStore.profile.name?.slice(0, 1).toUpperCase() || 'Я'
            }}</span
          >
          <span class="hidden max-w-28 truncate sm:block">Профиль</span>
        </NuxtLink>
        <NuxtLink
          v-if="userStore.profile?.roles.includes('admin')"
          to="/admin"
          class="text-amber-300 hover:text-amber-200"
          aria-label="Админка"
          ><span class="sm:hidden">A</span
          ><span class="hidden sm:inline">Админка</span></NuxtLink
        >
        <button
          v-if="userStore.profile?.token_id"
          class="min-h-10 px-1 text-zinc-400 hover:text-white"
          aria-label="Выйти"
          @click="authStore.logout"
        >
          <span class="sm:hidden" aria-hidden="true">↗</span
          ><span class="hidden sm:inline">Выйти</span>
        </button>
        <NuxtLink v-else to="/sign-in" class="text-zinc-400 hover:text-white"
          >Аккаунт</NuxtLink
        >
      </div>
    </div>
  </header>
</template>
