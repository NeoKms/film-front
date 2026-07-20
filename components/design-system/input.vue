<script setup lang="ts">
withDefaults(
  defineProps<{ modelValue?: string; error?: string; placeholder?: string; type?: string; disabled?: boolean; autocomplete?: string; autofocus?: boolean; inputmode?: 'text' | 'numeric' | 'email' | 'search' | 'tel' | 'url' }>(),
  { modelValue: '', error: undefined, placeholder: undefined, type: 'text', disabled: false, autocomplete: undefined, autofocus: false, inputmode: 'text' },
);
const emit = defineEmits<{ 'update:modelValue': [value: string]; blur: [] }>();
const handleInput = (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value);
</script>

<template>
  <div>
    <input :type="type" :placeholder="placeholder" :value="modelValue" :disabled="disabled" :autocomplete="autocomplete" :autofocus="autofocus" :inputmode="inputmode" class="min-h-12 w-full rounded-2xl border bg-white/5 px-4 py-3 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-300 disabled:opacity-50" :class="error ? 'border-red-400/60' : 'border-white/10'" @input="handleInput" @blur="emit('blur')">
    <p v-if="error" class="mt-1.5 text-left text-xs text-red-300">{{ error }}</p>
  </div>
</template>
