<script setup lang="ts">
import type { CanvasAPI, AppSettings, OverlayMode } from '@types'

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
    segmentCanvases.value = []
    appSettings.value = newSettings
}

function setSegmentCanvas(el: unknown, idx: number) {
    segmentCanvases.value[idx] = (el as CanvasAPI) ?? null
    drawPreview()
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

    const truthTable: Record<string, number[]> = {
        '0': [1, 0, 1, 1],
        '1': [0, 0, 0, 1],
        '2': [0, 0, 1, 0],
        '3': [1, 0, 1, 0],
        '4': [0, 1, 0, 0],
        '5': [0, 1, 1, 0],
        '6': [0, 1, 1, 1],
        '7': [1, 0, 0, 0],
        '8': [1, 1, 1, 1],
        '9': [1, 1, 1, 0],
    }

    const keys = Object.keys(truthTable)
    const numChars = keys.length
    const numSegments = appSettings.value.numSegments
    const segmentWidth = appSettings.value.segmentWidth
    const segmentHeight = appSettings.value.segmentHeight
    const padding = 1

    const totalWidth = numChars * (segmentWidth + padding * 2)
    const totalHeight = 3 * (segmentHeight + padding * 2)

    outCanvas.width = totalWidth
    outCanvas.height = totalHeight

    // Draw checkerboard background
    const color1 = '#121212'
    const color2 = '#242424'
    const cellWidth = segmentWidth + padding * 2
    const cellHeight = segmentHeight + padding * 2

    for (let y = 0; y < totalHeight; y += cellHeight) {
        for (let x = 0; x < totalWidth; x += cellWidth) {
            // offset every other row
            const rowOffset = (y / cellHeight) % 2
            ctx.fillStyle =
                (x / cellWidth + rowOffset) % 2 === 0 ? color1 : color2
            ctx.fillRect(x, y, cellWidth, cellHeight)
        }
    }

    for (let i = 0; i < numSegments; i++) {}

    segmentCanvases.value.forEach((segmentCanvas, idx) => {
        if (!segmentCanvas) return
        const segImageData = segmentCanvas.getImageData()
        if (!segImageData) return

        const xOffset = padding + idx * (segmentWidth + padding * 2)
        const yOffset = 1

        const segData = segImageData.data
        const canvasImageData = ctx.getImageData(0, 0, totalWidth, totalHeight)
        const data = canvasImageData.data

        for (let y = 0; y < segmentHeight; y++) {
            for (let x = 0; x < segmentWidth; x++) {
                const idx = (y * segmentWidth + x) * 4
                const canvasIdx =
                    ((y + yOffset) * totalWidth + (x + xOffset)) * 4
                // @ts-ignore
                const alpha = segData[idx + 3] / 255
                if (alpha === 0) continue
                // @ts-ignore
                data[canvasIdx + 0] = segData[idx + 0]
                // @ts-ignore
                data[canvasIdx + 1] = segData[idx + 1]
                // @ts-ignore
                data[canvasIdx + 2] = segData[idx + 2]
                data[canvasIdx + 3] = 255
            }
        }

        ctx.putImageData(canvasImageData, 0, 0)
    })

    // Helper to draw a line of raw segments or composed digits
    function drawLine(yOffset: number, overlayMode: 'screen' | 'additive') {
        if (!ctx) return
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
                const xOffset =
                    padding + digitIndex * (segmentWidth + padding * 2)

                for (let y = 0; y < segmentHeight; y++) {
                    for (let x = 0; x < segmentWidth; x++) {
                        const idx = (y * segmentWidth + x) * 4
                        const canvasIdx =
                            ((y + yOffset + padding) * totalWidth +
                                (x + xOffset)) *
                            4
                        if (
                            canvasIdx + 3 >= data.length ||
                            idx + 3 >= segData.length
                        )
                            continue

                        if (overlayMode === 'screen') {
                            if (segData[idx + 3] === 0) continue
                            data[canvasIdx + 0] = 255
                            data[canvasIdx + 1] = 255
                            data[canvasIdx + 2] = 255
                        } else if (overlayMode === 'additive') {
                            data[canvasIdx + 0] = Math.min(
                                // @ts-ignore
                                data[canvasIdx + 0] + segData[idx + 0],
                                255
                            )
                            data[canvasIdx + 1] = Math.min(
                                // @ts-ignore
                                data[canvasIdx + 1] + segData[idx + 1],
                                255
                            )
                            data[canvasIdx + 2] = Math.min(
                                // @ts-ignore
                                data[canvasIdx + 2] + segData[idx + 2],
                                255
                            )
                        }

                        data[canvasIdx + 3] = 255
                    }
                }
            })
        })

        if (!ctx) return
        ctx.putImageData(canvasImageData, 0, 0)
    }

    // Line 2: additive composed digits
    drawLine(segmentHeight + padding * 2, 'additive')
    // Line 3: screen composed digits, pure white
    drawLine(2 * (segmentHeight + padding * 2), 'screen')
}
</script>
<template>
    <TheGitIcon />
    <ClientOnly class="w-full overflow-x-auto h-[20vh]">
        <div
            class="flex items-center gap-4 px-4 py-3 border-2 rounded-lg border-secondary">
            <div
                v-for="i in appSettings.numSegments"
                :key="i"
                class="flex-shrink-0">
                <BaseCanvas
                    :ref="(el: any) => setSegmentCanvas(el, i - 1)"
                    :width="appSettings.segmentWidth"
                    :height="appSettings.segmentHeight"
                    :color="getColor(appSettings.numSegments, i - 1)"
                    @update:image-data="drawPreview" />
            </div>
        </div>
    </ClientOnly>
    <div class="w-full flex flex-row h-[80vh]">
        <div class="h-full w-[25vw] p-4">
            <TheSettingsInput
                storageKey="app:settings"
                @update:settings="handleSettingsUpdate" />
            <div class="mt-2 flex gap-2 items-center">
                <BaseButton @click="clearAllSegments">
                    Clear All Segments
                </BaseButton>
                <BaseButton @click="exportAllSegments">
                    Export All Segments
                </BaseButton>
                <BaseButton @click="logAllSegmentData">
                    Log ImageData
                </BaseButton>
            </div>
        </div>
        <div class="h-full w-[75vw] flex justify-center p-4">
            <canvas ref="charMapCanvas" class="w-full bg-black my-auto" />
        </div>
    </div>
</template>
<style scoped>
canvas {
    image-rendering: pixelated;
}
</style>
