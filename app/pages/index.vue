<script setup lang="ts">
import type { CanvasAPI, AppSettings } from '@types'

const segmentCanvases = ref<Array<CanvasAPI | null>>([])
const charMapCanvas = ref<HTMLCanvasElement | null>(null)
const appSettings = ref<AppSettings>({
    baseUrl: '',
    numSegments: 4,
    segmentWidth: 5,
    segmentHeight: 9,
    truthTable: {},
} as AppSettings)

function handleSettingsUpdate(newSettings: AppSettings) {
    appSettings.value = newSettings
}

function setSegmentCanvas(el: unknown, idx: number) {
    segmentCanvases.value[idx] = (el as CanvasAPI) ?? null
}

function clearAllSegments() {
    segmentCanvases.value.forEach((r) => r?.clear())
}

function exportAllSegments() {
    segmentCanvases.value.forEach((r) => r?.exportPNG())
}

function logAllSegmentData() {
    segmentCanvases.value.forEach((r, idx) => {
        console.log('segment', idx, r?.getImageData())
    })
}

// TODO: implement
function drawPreview() {}
</script>
<template>
    <div>
        <ClientOnly class="">
            <div class="w-full overflow-x-auto">
                <div class="flex items-center gap-4 px-4 py-3">
                    <div
                        v-for="i in appSettings.numSegments"
                        :key="i"
                        class="flex-shrink-0">
                        <BaseCanvas
                            :ref="(el: any) => setSegmentCanvas(el, i - 1)"
                            :width="appSettings.segmentWidth"
                            :height="appSettings.segmentHeight"
                            :showGrid="true" />
                    </div>
                </div>
            </div>
        </ClientOnly>

        <div class="mt-4">
            <TheSettingsInput
                storageKey="app:settings"
                @update:settings="handleSettingsUpdate" />
            <div class="mt-2 flex gap-2 items-center">
                <button
                    @click="drawPreview"
                    class="px-3 py-1 rounded bg-gray-700 text-white">
                    Redraw Preview
                </button>
                <button
                    @click="clearAllSegments"
                    class="px-3 py-1 rounded bg-gray-700 text-white">
                    Clear All
                </button>
                <button
                    @click="exportAllSegments"
                    class="px-3 py-1 rounded bg-blue-600 text-white">
                    Export All
                </button>
                <button
                    @click="logAllSegmentData"
                    class="px-3 py-1 rounded bg-gray-500 text-white">
                    Log ImageData
                </button>
            </div>
            <div class="mt-3">
                <div class="text-sm mb-2">Preview</div>
                <div class="p-2 inline-block bg-black">
                    <canvas ref="charMapCanvas"></canvas>
                </div>
            </div>
        </div>
    </div>
</template>
