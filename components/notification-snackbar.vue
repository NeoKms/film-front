<script setup lang="ts">
const notificationStore = useNotificationStore();
const notificationClasses = {
  success: 'border-emerald-300/20 bg-emerald-950/95 text-emerald-100',
  error: 'border-red-300/20 bg-red-950/95 text-red-100',
  warning: 'border-amber-300/20 bg-amber-950/95 text-amber-100',
  info: 'border-white/10 bg-zinc-900/95 text-white',
};
</script>

<template>
  <div class="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-center space-y-2 sm:left-auto sm:right-5 sm:items-end" role="status" aria-live="polite">
    <transition-group name="fade">
      <div
        v-for="notification in notificationStore.notifications"
        :key="notification.id"
        :class="[
          'relative flex w-full max-w-sm items-center rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur',
          notificationClasses[notification.type],
        ]"
      >
        <span class="text-sm font-medium">{{ notification.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.5s,
    transform 0.3s ease-in-out;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
