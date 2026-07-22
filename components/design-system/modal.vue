<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    closable?: boolean;
    title?: string;
    size?: 'default' | 'wide';
  }>(),
  { closable: true, title: undefined, size: 'default' },
);
const emit = defineEmits<{ 'update:isOpen': [value: boolean] }>();
const panel = ref<HTMLElement | null>(null);
let previousActiveElement: HTMLElement | null = null;

const close = () => {
  if (props.closable) emit('update:isOpen', false);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!props.isOpen) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== 'Tab' || !panel.value) return;
  const focusable = Array.from(
    panel.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
};

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (!import.meta.client) return;
    if (isOpen) {
      previousActiveElement = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';
      await nextTick();
      panel.value
        ?.querySelector<HTMLElement>('[autofocus], button, input')
        ?.focus();
    } else {
      document.body.style.overflow = '';
      previousActiveElement?.focus();
    }
  },
);

onMounted(() => document.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5"
        @mousedown.self="close"
      >
        <section
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="title || 'Диалог'"
          class="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#151820] p-5 text-zinc-100 shadow-2xl sm:rounded-[2rem] sm:p-7"
          :class="size === 'wide' ? 'sm:max-w-5xl' : 'sm:max-w-xl'"
        >
          <div
            v-if="title || closable"
            class="sticky -top-5 z-20 -mx-5 -mt-5 mb-5 flex items-center justify-between gap-4 border-b border-white/10 bg-[#151820]/95 px-5 py-4 backdrop-blur sm:-top-7 sm:-mx-7 sm:-mt-7 sm:px-7 sm:py-5"
          >
            <h2
              v-if="title"
              class="min-w-0 text-xl font-medium leading-tight text-white"
            >
              {{ title }}
            </h2>
            <span v-else />
            <button
              v-if="closable"
              type="button"
              class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/5 text-xl text-zinc-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Закрыть"
              @click="close"
            >
              ×
            </button>
          </div>
          <slot />
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 180ms ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active {
    transition: none;
  }
}
</style>
