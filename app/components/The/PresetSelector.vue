<script setup lang="ts">
import { presets } from '@types'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', val: string): void }>()

function onChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  emit('update:modelValue', val)
}
</script>

<template>
  <div class="mb-4 rounded">
    <label
      for="lang-select"
      class="mr-2 font-medium"
    >Presets:</label>
    <select
      id="lang-select"
      :value="props.modelValue"
      class="mt-3 w-full rounded bg-secondary px-3 py-1 outline-none"
      @change="onChange"
    >
      <option
        v-for="opt in presets"
        :key="opt.path"
        :value="opt.path"
      >
        {{ opt.label }}
      </option>
    </select>
  </div>
</template>
