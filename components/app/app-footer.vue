<template>
  <footer class="border-t border-white/10 bg-black/15 px-5 py-8">
    <div
      class="mx-auto grid max-w-6xl gap-7 text-sm text-zinc-400 lg:grid-cols-[1fr_auto_auto]"
    >
      <p>© {{ new Date().getFullYear() }} Film Together. Все права защищены.</p>
      <nav class="grid gap-3" aria-label="Сценарии выбора фильма">
        <span class="text-xs uppercase tracking-widest text-zinc-400"
          >Сценарии</span
        >
        <NuxtLink to="/for-couples" class="transition hover:text-white"
          >Для двоих</NuxtLink
        >
        <NuxtLink to="/for-friends" class="transition hover:text-white"
          >С друзьями</NuxtLink
        >
        <NuxtLink to="/for-groups" class="transition hover:text-white"
          >Для компании</NuxtLink
        >
      </nav>
      <nav class="grid gap-3" aria-label="Правовая информация">
        <span class="text-xs uppercase tracking-widest text-zinc-400"
          >Документы</span
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
