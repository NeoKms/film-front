<script setup lang="ts"></script>

<template>
  <div class="min-h-screen bg-[#0b0d12] text-zinc-100">
    <app-header />
    <main>
      <slot />
    </main>
    <app-footer />
    <app-cookie-notice />
  </div>
</template>

<style scoped></style>
