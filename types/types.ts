export interface CanvasAPI {
    clear: () => void
    getDataURL: () => string | null
    loadFromDataURL: (dataUrl: string) => Promise<void>
    getImageData: () => ImageData | null
}

export interface AppSettings {
    numSegments: number
    segmentWidth: number
    segmentHeight: number
    truthTable: Record<string, number[]>
    baseUrl?: string
    source?: {
        author?: string
        url?: string
    }
    segmentImages?: string[]
}

export interface SettingsAPI {
    validate: () => boolean
    save: () => void
    clearInput: () => void
    loadFromJson: (path: string) => Promise<void>
    errors: globalThis.Ref<string[], string[]>
    text: globalThis.Ref<string, string>
    parsed: globalThis.Ref<AppSettings>
}

export type TruthTable = Record<string, number[]>

export interface PresetOption {
    label: string
    path: string
}

export const presets: PresetOption[] = [
    {
        label: '4 segment display A (disconnected)',
        path: 'presets/4-seg-a.json',
    },
    {
        label: '4 segment display B (disconnected, overlap)',
        path: 'presets/4-seg-b.json',
    },
    { label: '4 segment display C', path: 'presets/4-seg-c.json' },
    { label: '4 segment display D', path: 'presets/4-seg-d.json' },
    { label: '5 segment display A', path: 'presets/5-seg-a.json' },
    { label: '6 segment display A', path: 'presets/6-seg-a.json' },
    { label: '6 segment display B', path: 'presets/6-seg-b.json' },
    { label: '6 segment display C', path: 'presets/6-seg-c.json' },
    { label: '7 segment display A', path: 'presets/7-seg-a.json' },
    { label: '8 segment display A', path: 'presets/8-seg-a.json' },
    { label: '8 segment display B', path: 'presets/8-seg-b.json' },
    { label: '8 segment display C (disconnected)', path: 'presets/8-seg-c.json' },
    { label: '9 segment display A', path: 'presets/9-seg-a.json' },
    { label: '10 segment display A (overlap)', path: 'presets/10-seg-a.json' },
    { label: '11 segment display A', path: 'presets/11-seg-a.json' },
    { label: '12 segment display A', path: 'presets/12-seg-a.json' },
    {
        label: '13 segment display A (disconnected)',
        path: 'presets/13-seg-a.json',
    },
    { label: '15 segment display A', path: 'presets/15-seg-a.json' },
    { label: '18 segment display A', path: 'presets/18-seg-a.json' },
] as const
