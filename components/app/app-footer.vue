<template>
  <footer class="border-t border-white/10 bg-black/15 px-5 py-5 sm:py-8">
    <div
      class="mx-auto grid max-w-6xl gap-3 text-sm text-zinc-400 sm:gap-7 lg:grid-cols-[1fr_auto_auto]"
    >
      <p class="order-3 text-xs lg:order-none lg:text-sm">
        © {{ new Date().getFullYear() }} Film Together<span
          class="hidden sm:inline"
          >. Все права защищены.</span
        >
      </p>
      <nav
        class="flex flex-wrap gap-x-4 gap-y-2 sm:grid sm:gap-3"
        aria-label="Сценарии выбора фильма"
      >
        <span
          class="hidden text-xs uppercase tracking-widest text-zinc-400 sm:block"
          >Сценарии</span
        >
        <NuxtLink
          to="/for-couples"
          class="inline-flex min-h-10 items-center transition hover:text-white sm:min-h-0"
          >Для двоих</NuxtLink
        >
        <NuxtLink
          to="/for-friends"
          class="inline-flex min-h-10 items-center transition hover:text-white sm:min-h-0"
          >С друзьями</NuxtLink
        >
        <NuxtLink
          to="/for-groups"
          class="inline-flex min-h-10 items-center transition hover:text-white sm:min-h-0"
          >Для компании</NuxtLink
        >
      </nav>
      <nav
        class="flex flex-wrap gap-x-4 gap-y-2 sm:grid sm:gap-3"
        aria-label="Правовая информация"
      >
        <span
          class="hidden text-xs uppercase tracking-widest text-zinc-400 sm:block"
          >Документы</span
        >
        <NuxtLink
          to="/legal/privacy"
          class="inline-flex min-h-10 items-center transition hover:text-white sm:min-h-0"
          >Обработка данных</NuxtLink
        >
        <NuxtLink
          to="/legal/cookies"
          class="inline-flex min-h-10 items-center transition hover:text-white sm:min-h-0"
          >Файлы cookie</NuxtLink
        >
        <NuxtLink
          to="/legal/terms"
          class="inline-flex min-h-10 items-center transition hover:text-white sm:min-h-0"
          >Пользовательское соглашение</NuxtLink
        >
      </nav>
    </div>
  </footer>
</template>
