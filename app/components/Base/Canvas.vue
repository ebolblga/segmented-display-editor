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
const lastPoint = ref<{ x: number, y: number } | null>(null)
const currentMode = ref<'draw' | 'erase' | null>(null)

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
  () => nextTick(initCanvases),
)

watch(
  () => props.height,
  () => nextTick(initCanvases),
)

onBeforeUnmount(() => {
  // Clean references
  visibleCtx = null
  offscreenCtx = null
  offscreen = null
  imageData = null
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
    visibleCanvas.value!.height,
  )
  visibleCtx.imageSmoothingEnabled = false
  visibleCtx.drawImage(offscreen, 0, 0)
}

function getPointerPixelCoords(e: PointerEvent) {
  if (!visibleCanvas.value) return null
  const rect = visibleCanvas.value.getBoundingClientRect()
  // Map client coords to logical canvas pixels using bounding rect
  const x = Math.floor(
    ((e.clientX - rect.left) / rect.width) * visibleCanvas.value.width,
  )
  const y = Math.floor(
    ((e.clientY - rect.top) / rect.height) * visibleCanvas.value.height,
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
  }
  catch {
    // Ignore capture errors
  }

  // Right button (2) => erase, otherwise draw
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
  }
  else {
    drawLine(last.x, last.y, p.x, p.y)
    lastPoint.value = { x: p.x, y: p.y }
  }
  redrawVisible()
}

function onPointerUp(e: PointerEvent) {
  if (!visibleCanvas.value) return
  try {
    if (typeof visibleCanvas.value.releasePointerCapture === 'function') {
      visibleCanvas.value.releasePointerCapture(e.pointerId)
    }
  }
  catch {
    // Ignore
  }
  drawing.value = false
  lastPoint.value = null
  currentMode.value = null
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
        offscreen!.height,
      )
      imageData = offscreenCtx!.getImageData(
        0,
        0,
        offscreen!.width,
        offscreen!.height,
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
        @contextmenu.prevent
      />
    </div>
  </div>
</template>
