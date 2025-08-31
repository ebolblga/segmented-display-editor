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
const settingsInputRef = ref<any>(null)

function handleSettingsUpdate(newSettings: AppSettings) {
    segmentCanvases.value = []
    appSettings.value = newSettings
}

async function setSegmentCanvas(el: unknown, idx: number) {
    segmentCanvases.value[idx] = (el as CanvasAPI) ?? null

    // If the settings JSON contained a segmentImages array, try to load it into the freshly mounted canvas
    try {
        const s = appSettings.value && (appSettings.value as any).segmentImages
        if (s && Array.isArray(s) && s[idx]) {
            // load image into canvas (async)
            await segmentCanvases.value[idx]!.loadFromDataURL(s[idx])
        }
    } catch (err) {
        // ignore load failure, but still continue
        console.warn('Failed to load segment image', idx, err)
    }

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

const truthTableRef = computed(() => appSettings.value.truthTable)

function drawPreview() {
    if (!charMapCanvas.value) return
    const outCanvas = charMapCanvas.value
    const ctx = outCanvas.getContext('2d')
    if (!ctx) return

    const truthTable: Record<string, number[]> = truthTableRef.value

    const keys = Object.keys(truthTable)
    const numChars = keys.length
    const numSegments = appSettings.value.numSegments
    const segmentWidth = appSettings.value.segmentWidth
    const segmentHeight = appSettings.value.segmentHeight
    const padding = 1

    const totalWidth = Math.max(numChars * (segmentWidth + padding * 2), numSegments * (segmentWidth + padding * 2))
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

// --- new: Save current settings + canvases into localStorage / settings input ---
async function saveSettingsIncludingCanvases() {
    // validate current JSON in TheSettingsInput
    if (!settingsInputRef?.value) {
        console.warn('Settings input ref not available')
        return
    }
    const ok = settingsInputRef.value.validate()
    if (!ok) {
        console.warn(
            'Settings JSON invalid; please fix before saving with canvases'
        )
        return
    }
  const baseSettings: AppSettings = JSON.parse(
    JSON.stringify(settingsInputRef.value.parsed)
  )

    // gather data URLs for each segment canvas
    const segs: Array<string | null> = []
    for (let i = 0; i < baseSettings.numSegments; i++) {
        const c = segmentCanvases.value[i]
        if (c?.getDataURL) {
            try {
                const url = c.getDataURL()
                segs.push(url)
            } catch (err) {
                console.warn('Failed to get dataURL for segment', i, err)
                segs.push(null)
            }
        } else {
            segs.push(null)
        }
    }

    // attach segmentImages (use nulls for missing entries)
    ;(baseSettings as any).segmentImages = segs.map((s) => s ?? '')

    const jsonText = stringifyCompactArrays(baseSettings, 2)
    // update the settings input text and localStorage
    settingsInputRef.value.text = jsonText
    if (settingsInputRef.value && settingsInputRef.value.save) {
        // call save to let TheSettingsInput persist & emit
        settingsInputRef.value.save()
    } else {
        // fallback
        localStorage.setItem('app:settings', jsonText)
    }

    // also apply to appSettings in-memory so newly added images are recognized
    appSettings.value = baseSettings
    // redraw preview (canvases already loaded)
    drawPreview()
}

function checkTable() {
    console.log(findExactGroups(truthTableRef.value))
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
                ref="settingsInputRef"
                storageKey="app:settings"
                @update:settings="handleSettingsUpdate" />
            <div class="mt-2 flex gap-2 items-center">
                <BaseButton @click="clearAllSegments">
                    Clear All Segments
                </BaseButton>
                <!-- <BaseButton @click="exportAllSegments">
                    Export All Segments
                </BaseButton> -->
                <!-- <BaseButton @click="logAllSegmentData">
                    Log ImageData
                </BaseButton> -->
                <BaseButton @click="saveSettingsIncludingCanvases">
                    Export Settings
                </BaseButton>
                <BaseButton @click="checkTable">
                    Check table
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
