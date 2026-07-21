<script setup lang="ts">
const route = useRoute();
const showFooter = computed(() => !route.path.startsWith('/room/'));
</script>

<template>
  <div class="min-h-screen bg-[#0b0d12] text-zinc-100">
    <app-header />
    <main>
      <slot />
    </main>
    <app-footer v-if="showFooter" />
    <app-cookie-notice />
  </div>
</template>

<style scoped></style>
