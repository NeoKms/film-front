<template>
  <div
    class="relative min-h-dvh overflow-hidden bg-[#0b0d12] px-5 py-8 text-zinc-100"
  >
    <div class="pointer-events-none absolute inset-0 cinematic-grid" />
    <NuxtLink
      to="/"
      class="relative text-sm font-semibold uppercase tracking-[0.18em] text-white"
      >Film <span class="text-amber-300">Together</span></NuxtLink
    >
    <main class="relative mx-auto mt-10 w-full max-w-md sm:mt-16">
      <slot />
    </main>
    <div
      class="relative mx-auto mt-8 flex max-w-md flex-wrap justify-center gap-x-4 gap-y-2 text-center text-xs text-zinc-600"
    >
      <NuxtLink to="/legal/privacy" class="hover:text-white"
        >Обработка данных</NuxtLink
      ><NuxtLink to="/legal/terms" class="hover:text-white"
        >Соглашение</NuxtLink
      >
    </div>
    <app-cookie-notice />
  </div>
</template>
