<script setup lang="ts">
withDefaults(
  defineProps<{ disabled?: boolean; loading?: boolean; variant?: 'primary' | 'secondary' | 'danger' }>(),
  { disabled: false, loading: false, variant: 'primary' },
);
</script>

<template>
  <button
    type="submit" :disabled="disabled || loading" class="flex min-h-12 w-full items-center justify-center rounded-2xl px-5 py-3 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-45" :class="{
    'bg-amber-300 text-zinc-950 hover:bg-amber-200': variant === 'primary',
    'border border-white/15 bg-white/5 text-white hover:bg-white/10': variant === 'secondary',
    'bg-red-400/15 text-red-200 hover:bg-red-400/25': variant === 'danger',
  }"
  >
    <design-system-loading v-if="loading" />
    <slot v-else />
  </button>
</template>
