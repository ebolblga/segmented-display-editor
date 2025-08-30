export interface PixelCanvasAPI {
  clear: () => void
  exportPNG: () => void
  getImageData: () => ImageData | null
}
