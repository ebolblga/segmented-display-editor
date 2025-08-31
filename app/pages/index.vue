<script setup lang="ts">
import type { CanvasAPI, AppSettings, SettingsAPI } from '@types'
import { useDebounceFn } from '@vueuse/core'

useSeoMeta({
    title: 'Segmented Display Editor',
    author: 'ebolblga',
    robots: 'index, follow',
})

useHead({
    link: [
        {
            rel: 'canonical',
            href: 'https://segmented-display-editor.vercel.app/about',
        },
    ],
})

const segmentCanvases = ref<Array<CanvasAPI | null>>([])
const charMapCanvas = ref<HTMLCanvasElement | null>(null)
const appSettings = ref<AppSettings>({
    numSegments: 0,
    segmentWidth: 0,
    segmentHeight: 0,
    truthTable: {},
} as AppSettings)
const settingsInputRef = ref<SettingsAPI | null>(null)
const selectedPreset = ref<string>('/appSettings.json')
const truthTableRef = computed(() => appSettings.value.truthTable)
let currentFaviconUrl: string | null = null

function handleSettingsUpdate(newSettings: AppSettings) {
    segmentCanvases.value = []
    appSettings.value = newSettings
}

function loadPreset(path: string) {
    if (!path) return
    settingsInputRef.value?.loadFromJson(path)
}

async function setSegmentCanvas(el: unknown, idx: number) {
    segmentCanvases.value[idx] = (el as CanvasAPI) ?? null

    // If the settings JSON contained a segmentImages array, try to load it into the freshly mounted canvas
    try {
        const s =
            appSettings.value &&
            (appSettings.value as AppSettings).segmentImages
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

function drawPreview() {
    drawFavicon()

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

    const totalWidth = Math.max(
        numChars * (segmentWidth + padding * 2),
        numSegments * (segmentWidth + padding * 2)
    )
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
            // Offset every other row
            const rowOffset = (y / cellHeight) % 2
            ctx.fillStyle =
                (x / cellWidth + rowOffset) % 2 === 0 ? color1 : color2
            ctx.fillRect(x, y, cellWidth, cellHeight)
        }
    }

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

async function saveSettingsIncludingCanvases() {
    // Validate current JSON in TheSettingsInput
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

    // Gather data URLs for each segment canvas
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

    // Attach segmentImages (use nulls for missing entries)
    ;(baseSettings as AppSettings).segmentImages = segs.map((s) => s ?? '')

    const jsonText = stringifyCompactArrays(baseSettings, 2)
    // Update the settings input text and localStorage
    settingsInputRef.value.text = jsonText
    if (settingsInputRef.value && settingsInputRef.value.save) {
        // Call save to let TheSettingsInput persist & emit
        settingsInputRef.value.save()
    } else {
        localStorage.setItem('app:settings', jsonText)
    }

    exportJson(jsonText)

    // Also apply to appSettings in-memory so newly added images are recognized
    appSettings.value = baseSettings
    drawPreview()
}

function exportJson(json: string): void {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'app-settings.json'
    a.click()
    URL.revokeObjectURL(url)
}

function checkTable() {
    const list: number[][] = findExactGroups(truthTableRef.value)

    if (list.length > 0) {
        console.info('Segments with identical patterns:', list)
        alert(`Segments with identical patterns: ${JSON.stringify(list)}}.`)
    } else {
        console.info(
            'Your truth table does not contain any segments with identical patterns.'
        )
        alert(
            'Your truth table does not contain any segments with identical patterns.'
        )
    }
}

async function exportYalSettings() {
    // Load JSON with default settings
    const response = await fetch('/yal-settings.json')
    if (!response.ok) throw new Error('Failed to load default settings')
    const json = await response.json()

    // Patch JSON
    const inGlyphs: string = Object.keys(appSettings.value.truthTable).join('')
    const glyphHeight = appSettings.value.segmentHeight
    const padding = 1

    json['in-glyphs'] = inGlyphs
    json['font-sample-text'] = inGlyphs
    json['font-preview-text'] = inGlyphs
    json['glyph-width'] = appSettings.value.segmentWidth
    json['glyph-height'] = glyphHeight
    json['font-name'] = `${appSettings.value.numSegments} Segment Display`
    json['glyph-ofs-y'] = 2 * (glyphHeight + padding * 2) + padding
    json['glyph-baseline'] = glyphHeight - 1

    // Download JSON
    const blob = new Blob([JSON.stringify(json, null, 2)], {
        type: 'application/json',
    })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'yal-settings.json'
    link.click()

    URL.revokeObjectURL(url)

    // Download character map
    if (charMapCanvas.value) {
        const canvas = charMapCanvas.value
        const dataURL = canvas.toDataURL('image/png')

        const link = document.createElement('a')
        link.href = dataURL
        link.download = 'character-map.png'
        link.click()
    }
}

function ensureFaviconLink(): HTMLLinkElement {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
    if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
    }
    return link
}

function compositeAndUpdateFavicon() {
    const sources = (segmentCanvases.value ?? []).filter(Boolean) as CanvasAPI[]
    if (sources.length === 0) return

    const favW = 32
    const favH = 32

    // Output buffer (clamped)
    const outBuf = new Uint8ClampedArray(favW * favH * 4)

    for (let s = 0; s < sources.length; s++) {
        const segImage = sources[s]?.getImageData()
        if (!segImage) continue

        const sw = segImage.width
        const sh = segImage.height
        const sdata = segImage.data

        // Nearest-neighbour scaling + additive per-channel
        for (let fy = 0; fy < favH; fy++) {
            // Map once per row
            const sy = Math.floor((fy * sh) / favH)
            for (let fx = 0; fx < favW; fx++) {
                const sx = Math.floor((fx * sw) / favW)

                const sIdx = (sy * sw + sx) * 4
                const alpha = sdata[sIdx + 3] // 0..255
                if (alpha === 0) continue

                const oIdx = (fy * favW + fx) * 4

                // Additive RGB, clamped
                // @ts-ignore
                const r = outBuf[oIdx + 0] + sdata[sIdx + 0]
                // @ts-ignore
                const g = outBuf[oIdx + 1] + sdata[sIdx + 1]
                // @ts-ignore
                const b = outBuf[oIdx + 2] + sdata[sIdx + 2]

                outBuf[oIdx + 0] = r > 255 ? 255 : r
                outBuf[oIdx + 1] = g > 255 ? 255 : g
                outBuf[oIdx + 2] = b > 255 ? 255 : b
                outBuf[oIdx + 3] = 255 // Keep opaque when anything drawn
            }
        }
    }

    // Blit to off-DOM canvas
    const canvas =
        typeof document !== 'undefined'
            ? (document.createElement('canvas') as HTMLCanvasElement)
            : null
    if (!canvas) return
    canvas.width = favW
    canvas.height = favH
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = new ImageData(outBuf, favW, favH)
    ctx.putImageData(imageData, 0, 0)

    // Update favicon (use toBlob + object URL)
    if (canvas.toBlob) {
        canvas.toBlob((blob) => {
            if (!blob) return
            revokePrevFavicon()
            const url = URL.createObjectURL(blob)
            const link = ensureFaviconLink()
            link.href = url
            currentFaviconUrl = url
        }, 'image/png')
    } else {
        try {
            const dataUrl = canvas.toDataURL('image/png')
            revokePrevFavicon()
            ensureFaviconLink().href = dataUrl
            currentFaviconUrl = null
        } catch {
            // ignore
        }
    }
}

const drawFavicon = useDebounceFn(compositeAndUpdateFavicon, 1000)

function revokePrevFavicon() {
    if (currentFaviconUrl) {
        try {
            URL.revokeObjectURL(currentFaviconUrl)
        } catch {}
        currentFaviconUrl = null
    }
}

onUnmounted(() => {
    revokePrevFavicon()
})
</script>

<template>
    <div>
        <TheGitIcon />
        <div class="min-h-[190.59px]">
            <ClientOnly class="h-[20vh] w-full overflow-x-auto">
                <div
                    class="flex items-center gap-4 rounded-lg border-2 border-secondary px-4 py-3">
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
        </div>
        <div class="flex h-[80vh] w-full flex-col lg:flex-row">
            <div class="h-full w-full p-4 lg:w-[25vw]">
                <NuxtLink to="/about" class="text-accent">{{
                    '<- About this tool'
                }}</NuxtLink>
                <ThePresetSelector
                    v-model="selectedPreset"
                    class="mt-3"
                    @update:model-value="loadPreset" />
                <div class="mb-2 flex items-center gap-2">
                    <BaseButton @click="clearAllSegments">
                        Clear All Segments
                    </BaseButton>
                    <BaseButton @click="checkTable"> Check Table </BaseButton>
                </div>
                <div class="mb-2 flex items-center gap-2">
                    <BaseButton @click="saveSettingsIncludingCanvases">
                        Export Settings
                    </BaseButton>
                    <BaseButton @click="exportYalSettings">
                        <a
                            href="https://yal.cc/tools/pixel-font/"
                            target="_blank"
                            >Export Yal Settings</a
                        >
                    </BaseButton>
                </div>
                <TheSettingsInput
                    ref="settingsInputRef"
                    storage-key="app:settings"
                    @update:settings="handleSettingsUpdate" />
            </div>
            <div class="flex h-full w-full justify-center p-4 lg:w-[75vw]">
                <canvas
                    ref="charMapCanvas"
                    class="my-auto w-full bg-black [image-rendering:pixelated]" />
            </div>
        </div>
    </div>
</template>
