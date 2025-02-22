<template>
  <footer class="border-t border-white/10 bg-black/15 px-5 py-8">
    <div
      class="mx-auto flex max-w-6xl flex-col gap-5 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between"
    >
      <p>© {{ new Date().getFullYear() }} Film Together. Все права защищены.</p>
      <nav
        class="flex flex-wrap gap-x-5 gap-y-3"
        aria-label="Правовая информация"
      >
        <NuxtLink to="/legal/privacy" class="transition hover:text-white"
          >Обработка данных</NuxtLink
        >
        <NuxtLink to="/legal/cookies" class="transition hover:text-white"
          >Файлы cookie</NuxtLink
        >
        <NuxtLink to="/legal/terms" class="transition hover:text-white"
          >Пользовательское соглашение</NuxtLink
        >
      </nav>
    </div>
  </footer>
</template>
