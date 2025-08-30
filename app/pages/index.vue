<script setup lang="ts">
import type { PixelCanvasAPI } from '@types'

const canvasRefs = ref<Array<PixelCanvasAPI | null>>([])
const segmentWidth = ref<number>(5)
const segmentHeight = ref<number>(9)
const numSegments = ref<number>(4)

function setCanvasRef(el: unknown, idx: number) {
    // el is the component public instance; we assert it matches our API
    canvasRefs.value[idx] = (el as PixelCanvasAPI) ?? null
}

function clearAll() {
    canvasRefs.value.forEach((r) => r?.clear())
}

function exportAll() {
    canvasRefs.value.forEach((r) => r?.exportPNG())
}

function logAllImageData() {
    canvasRefs.value.forEach((r, idx) => {
        console.log('segment', idx, r?.getImageData())
    })
}
</script>
<template>
    <div>
        <ClientOnly class="">
            <div class="w-full overflow-x-auto">
                <div class="flex items-center gap-4 px-4 py-3">
                    <div
                        v-for="i in numSegments"
                        :key="i"
                        class="flex-shrink-0">
                        <BaseCanvas
                            :ref="(el: any) => setCanvasRef(el, i - 1)"
                            :width="segmentWidth"
                            :height="segmentHeight"
                            :showGrid="true" />
                    </div>
                </div>
            </div>
        </ClientOnly>
        <div class="mt-4 flex gap-2">
            <button @click="clearAll" class="px-3 py-1 rounded bg-gray-700">
                Clear All
            </button>
            <button @click="exportAll" class="px-3 py-1 rounded bg-blue-600">
                Export All
            </button>
            <button
                @click="logAllImageData"
                class="px-3 py-1 rounded bg-gray-500">
                Log ImageData
            </button>
        </div>
    </div>
</template>
