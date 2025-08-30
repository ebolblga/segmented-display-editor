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

function drawPreview() {
    if (!charMapCanvas.value) return
    const outCanvas = charMapCanvas.value
    const ctx = outCanvas.getContext('2d')
    if (!ctx) return

    const truthTable: { [key: string]: number[] } = {
        "0": [1, 0, 1, 1],
        "1": [0, 0, 0, 1],
        "2": [0, 0, 1, 0],
        "3": [1, 0, 1, 0],
        "4": [0, 1, 0, 0],
        "5": [0, 1, 1, 0],
        "6": [0, 1, 1, 1],
        "7": [1, 0, 0, 0],
        "8": [1, 1, 1, 1],
        "9": [1, 1, 1, 0]
    }

    const keys = Object.keys(truthTable)

    const numChars = keys.length
    const numSegments = appSettings.value.numSegments
    const segmentWidth = appSettings.value.segmentWidth
    const segmentHeight = appSettings.value.segmentHeight

    const totalWidth = segmentWidth * numChars
    const totalHeight = segmentHeight * 3

    outCanvas.width = totalWidth
    outCanvas.height = totalHeight

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height)

    const canvasImageData = ctx.getImageData(0, 0, totalWidth, totalHeight)
    const data = canvasImageData.data

    keys.forEach((key, digitIndex) => {
        const segments = truthTable[key]
        if (!segments) return

        segments.forEach((isOn, segIndex) => {
            if (!isOn) return
            const segmentCanvas = segmentCanvases.value[segIndex]
            if (!segmentCanvas) return
            const segImageData = segmentCanvas.getImageData()

            if (!segImageData) return

            const segData = segImageData.data

            // x/y position of this digit
            const xOffset = digitIndex * segmentWidth
            const yOffset = 0 // first row

            const canvasLength = data.length
            const segLength = segData.length

            for (let y = 0; y < segmentHeight; y++) {
                for (let x = 0; x < segmentWidth; x++) {
                    const idx = (y * segmentWidth + x) * 4
                    const canvasIdx = ((y + yOffset) * totalWidth + (x + xOffset)) * 4

                    // bounds check to satisfy TypeScript
                    if (canvasIdx + 3 >= canvasLength || idx + 3 >= segLength) continue
                    // @ts-ignore
                    data[canvasIdx + 0] = Math.min(data[canvasIdx + 0] + segData[idx + 0], 255)
                    // @ts-ignore
                    data[canvasIdx + 1] = Math.min(data[canvasIdx + 1] + segData[idx + 1], 255)
                    // @ts-ignore
                    data[canvasIdx + 2] = Math.min(data[canvasIdx + 2] + segData[idx + 2], 255)
                    data[canvasIdx + 3] = 255
                }
            }
        })
    })

    ctx.putImageData(canvasImageData, 0, 0)
}

function onImageDataUpdate() {
    drawPreview()
}
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
                            :color="getColor(appSettings.numSegments, i - 1)"
                            @update:image-data="onImageDataUpdate" />
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
                <div class="p-2 inline-block">
                    <canvas ref="charMapCanvas" class="h-[300px] bg-black"></canvas>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
canvas {
    image-rendering: pixelated;
}
</style>