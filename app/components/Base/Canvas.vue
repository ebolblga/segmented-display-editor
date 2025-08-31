<script setup lang="ts">
import type { CanvasAPI } from '@types'

const props = defineProps<{
    width: number
    height: number
    color: [number, number, number, number]
}>()

const emit = defineEmits<{
    (e: 'update:imageData', data: ImageData): void
}>()

const visibleCanvas = ref<HTMLCanvasElement | null>(null)
let visibleCtx: CanvasRenderingContext2D | null = null

let offscreen: HTMLCanvasElement | null = null
let offscreenCtx: CanvasRenderingContext2D | null = null
let imageData: ImageData | null = null

const drawing = ref(false)
const lastPoint = ref<{ x: number; y: number } | null>(null)
const currentMode = ref<'draw' | 'erase' | null>(null)

/* === NEW: touch / long-press state === */
let longPressTimer: number | null = null
let isLongPress = false
let touchStartClient: { x: number; y: number } | null = null
let movedWhileTouching = false
const LONG_PRESS_MS = 500
const MOVE_TOLERANCE = 6 // px

// Initialize canvases (client only)
function initCanvases() {
    if (typeof window === 'undefined' || !visibleCanvas.value) return

    // Create offscreen logical canvas
    offscreen = document.createElement('canvas')
    offscreen.width = Math.max(1, Math.floor(props.width))
    offscreen.height = Math.max(1, Math.floor(props.height))
    offscreenCtx = offscreen.getContext('2d')
    if (!offscreenCtx) {
        offscreen = null
        offscreenCtx = null
        return
    }

    // Image data buffer
    imageData = offscreenCtx.createImageData(offscreen.width, offscreen.height)
    offscreenCtx.putImageData(imageData, 0, 0)

    // Visible canvas context (logical coordinate system equals width/height attrs)
    visibleCtx = visibleCanvas.value.getContext('2d')
    if (!visibleCtx) {
        visibleCtx = null
        return
    }
    visibleCtx.imageSmoothingEnabled = false

    redrawVisible()
}

onMounted(() => {
    // ensure DOM mounted so visibleCanvas ref exists
    nextTick(() => initCanvases())
})

watch(
    () => props.width,
    () => nextTick(initCanvases)
)

watch(
    () => props.height,
    () => nextTick(initCanvases)
)

onBeforeUnmount(() => {
    // Clean references
    visibleCtx = null
    offscreenCtx = null
    offscreen = null
    imageData = null
    // clear any lingering timers
    if (longPressTimer !== null) {
        clearTimeout(longPressTimer)
        longPressTimer = null
    }
})

function clamp(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, v))
}

function setPixel(x: number, y: number) {
    if (!imageData) return
    if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) return
    const i = (y * imageData.width + x) * 4
    const [r, g, b, a] = props.color
    imageData.data[i] = r
    imageData.data[i + 1] = g
    imageData.data[i + 2] = b
    imageData.data[i + 3] = a
}

function clearPixel(x: number, y: number) {
    if (!imageData) return
    if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) return
    const i = (y * imageData.width + x) * 4
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

// Bresenham's line algorithm
function drawLine(x0: number, y0: number, x1: number, y1: number) {
    const dx = Math.abs(x1 - x0)
    const sx = x0 < x1 ? 1 : -1
    const dy = -Math.abs(y1 - y0)
    const sy = y0 < y1 ? 1 : -1
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
    // Copy imageData to offscreen, then draw to visible (logical sizes)
    offscreenCtx.putImageData(imageData, 0, 0)

    visibleCtx.clearRect(
        0,
        0,
        visibleCanvas.value!.width,
        visibleCanvas.value!.height
    )
    visibleCtx.imageSmoothingEnabled = false
    visibleCtx.drawImage(offscreen, 0, 0)
}

function getPointerPixelCoords(e: PointerEvent) {
    if (!visibleCanvas.value) return null
    const rect = visibleCanvas.value.getBoundingClientRect()
    // Map client coords to logical canvas pixels using bounding rect
    const x = Math.floor(
        ((e.clientX - rect.left) / rect.width) * visibleCanvas.value.width
    )
    const y = Math.floor(
        ((e.clientY - rect.top) / rect.height) * visibleCanvas.value.height
    )
    return {
        x: clamp(x, 0, visibleCanvas.value.width - 1),
        y: clamp(y, 0, visibleCanvas.value.height - 1),
    }
}

/* === NEW helper: map client coords (from stored touch) to pixel coords === */
function clientToPixel(clientX: number, clientY: number) {
    if (!visibleCanvas.value) return null
    const rect = visibleCanvas.value.getBoundingClientRect()
    const x = Math.floor(
        ((clientX - rect.left) / rect.width) * visibleCanvas.value.width
    )
    const y = Math.floor(
        ((clientY - rect.top) / rect.height) * visibleCanvas.value.height
    )
    return {
        x: clamp(x, 0, visibleCanvas.value.width - 1),
        y: clamp(y, 0, visibleCanvas.value.height - 1),
    }
}

function onPointerDown(e: PointerEvent) {
    e.preventDefault()
    if (!visibleCanvas.value) return

    // Use the canvas element for pointer capture/release to be safer
    try {
        if (typeof visibleCanvas.value.setPointerCapture === 'function') {
            visibleCanvas.value.setPointerCapture(e.pointerId)
        }
    } catch {
        // Ignore capture errors
    }

    // MOUSE / PEN: keep existing immediate behaviour (right-click = erase)
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        currentMode.value = e.button === 2 ? 'erase' : 'draw'
        drawing.value = true

        const p = getPointerPixelCoords(e)
        if (!p) return

        if (currentMode.value === 'erase') applyEraseAt(p.x, p.y)
        else applyBrushAt(p.x, p.y)

        lastPoint.value = { x: p.x, y: p.y }
        redrawVisible()
        return
    }

    // TOUCH: don't immediately place a pixel. Start long-press timer for erase.
    drawing.value = true
    currentMode.value = null
    isLongPress = false
    movedWhileTouching = false
    touchStartClient = { x: e.clientX, y: e.clientY }

    // start long-press timer
    if (longPressTimer !== null) {
        clearTimeout(longPressTimer)
        longPressTimer = null
    }
    const startX = e.clientX
    const startY = e.clientY
    longPressTimer = window.setTimeout(() => {
        longPressTimer = null
        isLongPress = true
        // compute pixel coords from stored client coords (don't rely on event)
        const p = clientToPixel(startX, startY)
        if (!p) return
        currentMode.value = 'erase'
        applyEraseAt(p.x, p.y)
        lastPoint.value = { x: p.x, y: p.y } // so dragging continues from here
        redrawVisible()
    }, LONG_PRESS_MS)
}

function onPointerMove(e: PointerEvent) {
    if (!drawing.value) return

    // TOUCH: detect move beyond tolerance -> cancel long press and start drawing
    if (e.pointerType === 'touch') {
        if (touchStartClient) {
            const dx = e.clientX - touchStartClient.x
            const dy = e.clientY - touchStartClient.y
            const dist2 = dx * dx + dy * dy
            if (
                !movedWhileTouching &&
                dist2 > MOVE_TOLERANCE * MOVE_TOLERANCE
            ) {
                movedWhileTouching = true
                // cancel long-press timer if running
                if (longPressTimer !== null) {
                    clearTimeout(longPressTimer)
                    longPressTimer = null
                }
                // if we weren't in long-press erase mode, switch to draw mode
                if (!isLongPress) currentMode.value = 'draw'
                // set lastPoint to current pixel so drawing continues smoothly
                const p = clientToPixel(e.clientX, e.clientY)
                if (p) lastPoint.value = { x: p.x, y: p.y }
            }
        }

        // draw/erase while moving if we've started dragging or we are already in erase (long-press)
        if ((movedWhileTouching || isLongPress) && currentMode.value) {
            const p = clientToPixel(e.clientX, e.clientY)
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
        return
    }

    // Mouse/pen: original behavior (draw while holding left button)
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
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
}

function onPointerUp(e: PointerEvent) {
    if (!visibleCanvas.value) return
    try {
        if (typeof visibleCanvas.value.releasePointerCapture === 'function') {
            visibleCanvas.value.releasePointerCapture(e.pointerId)
        }
    } catch {
        // Ignore
    }

    // clear long-press timer if still pending
    if (longPressTimer !== null) {
        clearTimeout(longPressTimer)
        longPressTimer = null
    }

    // TOUCH: decide tap (place) vs long-press (already handled) vs drag (already drawn)
    if (e.pointerType === 'touch') {
        if (!isLongPress && !movedWhileTouching) {
            // treat as tap -> place pixel
            if (touchStartClient) {
                const p = clientToPixel(e.clientX, e.clientY)
                if (p) {
                    currentMode.value = 'draw'
                    applyBrushAt(p.x, p.y)
                    redrawVisible()
                }
            }
        }
        // if long-press was active, erase already applied (and dragging erased)
    }

    drawing.value = false
    lastPoint.value = null
    currentMode.value = null
    isLongPress = false
    movedWhileTouching = false
    touchStartClient = null

    if (imageData) emit('update:imageData', imageData)
}

// API
function clearCanvas() {
    if (!imageData || !offscreenCtx || !offscreen) return
    // zero out the buffer
    imageData.data.fill(0)
    offscreenCtx.clearRect(0, 0, offscreen.width, offscreen.height)
    offscreenCtx.putImageData(imageData, 0, 0)
    redrawVisible()
    emit('update:imageData', imageData)
}

function loadFromDataURL(dataUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            return reject(new Error('Not available on server'))
        }
        // ensure canvases exist
        initCanvases()
        if (!offscreenCtx || !offscreen)
            return reject(new Error('Canvas not initialized'))

        const img = new Image()
        img.onload = () => {
            // draw into offscreen at logical size (stretch/fit to logical canvas size)
            offscreenCtx!.clearRect(0, 0, offscreen!.width, offscreen!.height)
            offscreenCtx!.drawImage(
                img,
                0,
                0,
                offscreen!.width,
                offscreen!.height
            )
            imageData = offscreenCtx!.getImageData(
                0,
                0,
                offscreen!.width,
                offscreen!.height
            )
            offscreenCtx!.putImageData(imageData, 0, 0)
            redrawVisible()
            emit('update:imageData', imageData)
            resolve()
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = dataUrl
    })
}

function getDataURL(): string | null {
    if (!imageData) return null
    const tmp = document.createElement('canvas')
    tmp.width = props.width
    tmp.height = props.height
    const tctx = tmp.getContext('2d')!
    tctx.putImageData(imageData, 0, 0)
    return tmp.toDataURL('image/png')
}

const publicApi: CanvasAPI = {
    clear: clearCanvas,
    loadFromDataURL,
    getDataURL,
    getImageData: () => imageData,
}

defineExpose(publicApi)
</script>

<template>
    <div :class="['inline-block', $attrs.class]">
        <div class="flex items-center justify-center p-2">
            <canvas
                ref="visibleCanvas"
                :width="Math.max(1, props.width)"
                :height="Math.max(1, props.height)"
                class="block h-[128px] touch-none select-none bg-black [image-rendering:pixelated]"
                @pointerdown="onPointerDown"
                @pointermove="onPointerMove"
                @pointerup="onPointerUp"
                @pointercancel="onPointerUp"
                @pointerleave="onPointerUp"
                @contextmenu.prevent />
        </div>
    </div>
</template>
