<script setup lang="ts">
const props = withDefaults(defineProps<{ min: number; max: number; step?: number; modelValue: [number, number] }>(), { step: 0.1 });
const emit = defineEmits<{ 'update:modelValue': [value: [number, number]] }>();
const localMin = ref(props.modelValue[0]);
const localMax = ref(props.modelValue[1]);
watch(() => props.modelValue, (value) => { [localMin.value, localMax.value] = value; });
const update = (isMin: boolean) => {
  if (isMin && localMin.value > localMax.value - props.step) localMin.value = localMax.value - props.step;
  if (!isMin && localMax.value < localMin.value + props.step) localMax.value = localMin.value + props.step;
  emit('update:modelValue', [Number(localMin.value), Number(localMax.value)]);
};
const left = computed(() => ((localMin.value - props.min) / (props.max - props.min)) * 100);
const right = computed(() => ((localMax.value - props.min) / (props.max - props.min)) * 100);
</script>

<template>
  <div class="relative pb-5 pt-1">
    <div class="mb-3 flex justify-between text-xs font-medium text-zinc-400"><span>{{ localMin }}</span><span>{{ localMax }}</span></div>
    <div class="relative h-1.5 rounded-full bg-white/10"><div class="absolute h-full rounded-full bg-amber-300" :style="{ left: `${left}%`, right: `${100 - right}%` }" /></div>
    <input v-model.number="localMin" type="range" :min="min" :max="max" :step="step" aria-label="Минимальное значение" @input="update(true)">
    <input v-model.number="localMax" type="range" :min="min" :max="max" :step="step" aria-label="Максимальное значение" @input="update(false)">
  </div>
</template>

<style scoped>
input[type='range'] { appearance: none; position: absolute; bottom: 14px; left: 0; height: 18px; width: 100%; background: transparent; pointer-events: none; }
input[type='range']::-webkit-slider-thumb { appearance: none; height: 20px; width: 20px; border: 3px solid #151820; border-radius: 999px; background: #fcd34d; cursor: pointer; pointer-events: auto; }
input[type='range']::-moz-range-thumb { height: 14px; width: 14px; border: 3px solid #151820; border-radius: 999px; background: #fcd34d; cursor: pointer; pointer-events: auto; }
</style>
