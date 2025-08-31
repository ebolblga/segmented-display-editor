export interface CanvasAPI {
  clear: () => void
  exportPNG: () => void
  getImageData: () => ImageData | null
  getDataURL: () => string | null
  loadFromDataURL: (dataUrl: string) => Promise<void>
}

export interface AppSettings {
  baseUrl?: string
  author?: string
  numSegments: number
  segmentWidth: number
  segmentHeight: number
  truthTable: Record<string, number[]>
  segmentImages?: string[]
}
