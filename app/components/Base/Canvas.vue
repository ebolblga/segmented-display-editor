<script setup lang="ts">
const DISPLAY_HEIGHT = 128 // visual container height for each segment (px)

const props = defineProps<{
    width: number
    height: number
    showGrid?: boolean
}>()

// compute an integer scale so rendered pixels are sharp
const scale = computed(() => {
    // avoid 0 / negative
    const h = Math.max(1, props.height)
    return Math.max(1, Math.floor(DISPLAY_HEIGHT / h))
})
const cssWidth = computed(() => `${props.width * scale.value}px`)
const cssHeight = computed(() => `${props.height * scale.value}px`)

// --- canvas / drawing state (keeps same logic as before) ---
// refs and contexts
const visibleCanvas = ref<HTMLCanvasElement | null>(null)
let visibleCtx: CanvasRenderingContext2D | null = null

// offscreen canvas created in initCanvases (to avoid SSR issues)
let offscreen: HTMLCanvasElement | null = null
let offscreenCtx: CanvasRenderingContext2D | null = null
let imageData: ImageData | null = null

const drawing = ref(false)
const lastPoint = ref<{ x: number; y: number } | null>(null)
const currentMode = ref<'draw' | 'erase' | null>(null)

function initCanvases() {
    // guard for SSR / server render — run only on client when visibleCanvas exists
    if (typeof window === 'undefined' || !visibleCanvas.value) return

    offscreen = document.createElement('canvas')
    offscreen.width = props.width
    offscreen.height = props.height
    offscreenCtx = offscreen.getContext('2d')
    if (!offscreenCtx) throw new Error('Could not get offscreen context')

    imageData = offscreenCtx.createImageData(props.width, props.height)
    offscreenCtx.putImageData(imageData, 0, 0)

    visibleCtx = visibleCanvas.value.getContext('2d')
    if (!visibleCtx) throw new Error('Could not get visible context')

    // we only set CSS sizes; the logical resolution stays unchanged
    visibleCtx.imageSmoothingEnabled = false

    redrawVisible()
}

onMounted(() => initCanvases())
watch(
    () => props.width,
    () => initCanvases()
)
watch(
    () => props.height,
    () => initCanvases()
)

function clamp(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, v))
}

function setPixel(x: number, y: number) {
    if (!imageData) return
    if (x < 0 || x >= props.width || y < 0 || y >= props.height) return
    const i = (y * props.width + x) * 4
    imageData.data[i] = 255
    imageData.data[i + 1] = 255
    imageData.data[i + 2] = 255
    imageData.data[i + 3] = 255
}

function clearPixel(x: number, y: number) {
    if (!imageData) return
    if (x < 0 || x >= props.width || y < 0 || y >= props.height) return
    const i = (y * props.width + x) * 4
    imageData.data[i] = 0
    imageData.data[i + 1] = 0
    imageData.data[i + 2] = 0
    imageData.data[i + 3] = 0
}

function applyBrushAt(x: number, y: number) {
    setPixel(x, y)
}
function applyEraseAt(x: number, y: number) {
    clearPixel(x, y)
}

function drawLine(x0: number, y0: number, x1: number, y1: number) {
    let dx = Math.abs(x1 - x0)
    let sx = x0 < x1 ? 1 : -1
    let dy = -Math.abs(y1 - y0)
    let sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    let x = x0
    let y = y0
    while (true) {
        if (currentMode.value === 'erase') applyEraseAt(x, y)
        else applyBrushAt(x, y)
        if (x === x1 && y === y1) break
        const e2 = 2 * err
        if (e2 >= dy) {
            err += dy
            x += sx
        }
        if (e2 <= dx) {
            err += dx
            y += sy
        }
    }
}

function redrawVisible() {
    if (!visibleCtx || !offscreenCtx || !imageData || !offscreen) return
    offscreenCtx.putImageData(imageData, 0, 0)

    // clear visible and draw offscreen at logical size — CSS scales it for display
    visibleCtx.clearRect(0, 0, props.width, props.height)
    visibleCtx.imageSmoothingEnabled = false
    visibleCtx.drawImage(offscreen, 0, 0)

    if (props.showGrid) {
        visibleCtx.save()
        visibleCtx.lineWidth = 1
        visibleCtx.strokeStyle = 'rgba(255,255,255,0.06)'
        for (let i = 1; i < props.width; i++) {
            const x = i + 0.5
            visibleCtx.beginPath()
            visibleCtx.moveTo(x, 0)
            visibleCtx.lineTo(x, props.height)
            visibleCtx.stroke()
        }
        for (let j = 1; j < props.height; j++) {
            const y = j + 0.5
            visibleCtx.beginPath()
            visibleCtx.moveTo(0, y)
            visibleCtx.lineTo(props.width, y)
            visibleCtx.stroke()
        }
        visibleCtx.restore()
    }
}

function getPointerPixelCoords(e: PointerEvent) {
    if (!visibleCanvas.value) return null
    const rect = visibleCanvas.value.getBoundingClientRect()
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * props.width)
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * props.height)
    return { x: clamp(x, 0, props.width - 1), y: clamp(y, 0, props.height - 1) }
}

function onPointerDown(e: PointerEvent) {
    e.preventDefault()
    if (!visibleCanvas.value) return
    ;(e.target as Element).setPointerCapture(e.pointerId)

    currentMode.value = e.button === 2 ? 'erase' : 'draw'
    drawing.value = true

    const p = getPointerPixelCoords(e)
    if (!p) return

    if (currentMode.value === 'erase') applyEraseAt(p.x, p.y)
    else applyBrushAt(p.x, p.y)

    lastPoint.value = { x: p.x, y: p.y }
    redrawVisible()
}

function onPointerMove(e: PointerEvent) {
    if (!drawing.value) return
    const p = getPointerPixelCoords(e)
    if (!p) return
    const last = lastPoint.value
    if (!last) {
        if (currentMode.value === 'erase') applyEraseAt(p.x, p.y)
        else applyBrushAt(p.x, p.y)
        lastPoint.value = { x: p.x, y: p.y }
    } else {
        drawLine(last.x, last.y, p.x, p.y)
        lastPoint.value = { x: p.x, y: p.y }
    }
    redrawVisible()
}

function onPointerUp(e: PointerEvent) {
    if (!visibleCanvas.value) return
    try {
        ;(e.target as Element).releasePointerCapture(e.pointerId)
    } catch {}
    drawing.value = false
    lastPoint.value = null
    currentMode.value = null
    if (imageData) emitUpdateImage()
}

const emit = defineEmits<{
    (e: 'update:imageData', data: ImageData): void
}>()
function emitUpdateImage() {
    if (imageData) emit('update:imageData', imageData)
}

function clearCanvas() {
    if (!imageData || !offscreenCtx || !offscreen) return
    for (let i = 0; i < imageData.data.length; i++) imageData.data[i] = 0
    offscreenCtx.clearRect(0, 0, offscreen.width, offscreen.height)
    offscreenCtx.putImageData(imageData, 0, 0)
    redrawVisible()
    emitUpdateImage()
}

function exportPNG() {
    const tmp = document.createElement('canvas')
    tmp.width = props.width
    tmp.height = props.height
    const tctx = tmp.getContext('2d')!
    if (imageData) tctx.putImageData(imageData, 0, 0)
    tmp.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'pixels.png'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
    }, 'image/png')
}

const publicApi = {
    clear: clearCanvas,
    exportPNG,
    getImageData: () => imageData,
}
defineExpose(publicApi)
</script>
<template>
    <div :class="['inline-block', $attrs.class]" class="segment-wrapper">
        <div class="bg-black h-[128px] flex items-center justify-center p-2">
            <canvas
                ref="visibleCanvas"
                :width="props.width"
                :height="props.height"
                :style="{ width: cssWidth, height: cssHeight }"
                class="block touch-none select-none"
                @pointerdown="onPointerDown"
                @pointermove="onPointerMove"
                @pointerup="onPointerUp"
                @pointercancel="onPointerUp"
                @pointerleave="onPointerUp"
                @contextmenu.prevent />
        </div>
    </div>
</template>
<style scoped>
canvas {
    /* ensure crisp pixel scaling */
    image-rendering: pixelated;
    /* block-level sizes are set via inline style bindings (cssWidth/cssHeight) */
    display: block;
}
</style>
