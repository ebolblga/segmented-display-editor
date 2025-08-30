export interface CanvasAPI {
    clear: () => void
    exportPNG: () => void
    getImageData: () => ImageData | null
}

export interface AppSettings {
    baseUrl: string
    numSegments: number
    segmentWidth: number
    segmentHeight: number
    truthTable: { [key: string]: number[] }
}
