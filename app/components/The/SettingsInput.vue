<script setup lang="ts">
import type { AppSettings, SettingsAPI } from '@types'
import { useDebounceFn } from '@vueuse/core'

const props = defineProps<{ storageKey?: string }>()
const emit = defineEmits<{
    (e: 'update:settings', settings: AppSettings): void
}>()

const text = ref<string>('')
const errors = ref<string[]>([])
const parsed = ref<AppSettings | null>(null)

const isValid = computed(
    () => parsed.value !== null && errors.value.length === 0
)

function validate(): boolean {
    errors.value = []
    parsed.value = null
    let raw: unknown

    try {
        raw = JSON.parse(text.value)
    } catch (e) {
        errors.value.push(
            'Invalid JSON: ' + (e instanceof Error ? e.message : String(e))
        )
        return false
    }

    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        errors.value.push('Top-level value must be a JSON object.')
        return false
    }

    const obj = raw as Partial<AppSettings>
    const out: AppSettings = {
        numSegments: 0,
        segmentWidth: 0,
        segmentHeight: 0,
        truthTable: {},
    }

    for (const key of [
        'numSegments',
        'segmentWidth',
        'segmentHeight',
    ] as const) {
        if (typeof obj[key] !== 'number' || !Number.isFinite(obj[key])) {
            errors.value.push(`${key} must be a number.`)
        } else {
            out[key] = obj[key]!
        }
    }

    // TruthTable validation
    if (
        obj.truthTable === undefined ||
        typeof obj.truthTable !== 'object' ||
        Array.isArray(obj.truthTable)
    ) {
        errors.value.push(
            'truthTable must be an object { [key: string]: number[] }.'
        )
    } else {
        const tt = obj.truthTable as Record<string, unknown>
        const seen = new Set<string>()
        const coerced: Record<string, number[]> = {}
        for (const [k, v] of Object.entries(tt)) {
            if (!Array.isArray(v)) {
                errors.value.push(`truthTable["${k}"] must be an array.`)
                continue
            }
            if (v.length !== out.numSegments) {
                errors.value.push(
                    `truthTable["${k}"] must have length ${out.numSegments}.`
                )
            }
            const nums: number[] = []
            let bad = false
            for (let i = 0; i < v.length; i++) {
                const elem = v[i]
                if (typeof elem === 'number' && Number.isFinite(elem)) {
                    nums.push(elem)
                } else {
                    errors.value.push(
                        `truthTable["${k}"][${i}] must be a number.`
                    )
                    bad = true
                    break
                }
            }
            if (!bad) {
                const sig = JSON.stringify(nums)
                if (seen.has(sig)) {
                    errors.value.push(
                        `truthTable["${k}"] duplicates another pattern.`
                    )
                } else {
                    seen.add(sig)
                    coerced[k] = nums
                }
            }
        }
        out.truthTable = coerced
    }

    // Optional: segmentImages (array of base64 dataURLs)
    if (obj.segmentImages !== undefined) {
        if (!Array.isArray(obj.segmentImages)) {
            errors.value.push('segmentImages must be an array of strings.')
        } else if (obj.segmentImages.length !== out.numSegments) {
            errors.value.push(
                `segmentImages must have length ${out.numSegments}.`
            )
        } else {
            const segs: string[] = []
            for (let i = 0; i < obj.segmentImages.length; i++) {
                const s = obj.segmentImages[i]
                if (typeof s !== 'string') {
                    errors.value.push(`segmentImages[${i}] must be a string.`)
                    break
                }
                // Optionally check data URL prefix; not strictly required
                if (!s.startsWith('data:image')) {
                    // Just warn — accept non-data URLs too, but ensure type is string
                }
                segs.push(s)
            }
            if (segs.length === out.numSegments) {
                // @ts-ignore allow optional property on AppSettings
                out.segmentImages = segs
            }
        }
    }

    if (errors.value.length === 0) {
        parsed.value = out
        return true
    }
    return false
}

const debouncedSave = useDebounceFn(save, 500)

function save() {
    if (!validate()) return
    if (props.storageKey) {
        localStorage.setItem(props.storageKey, text.value)
    }
    if (parsed.value) {
        emit('update:settings', parsed.value)
    }
}

function clearInput() {
    text.value = ''
    parsed.value = null
    errors.value = []
    if (props.storageKey) {
        localStorage.removeItem(props.storageKey)
    }
}

// Load from localStorage on mount
onMounted(async () => {
    if (props.storageKey) {
        const saved = localStorage.getItem(props.storageKey)
        if (saved) {
            text.value = saved
            save()
            return
        }
    }

    // nothing in localStorage → try to load /appSettings.json
    loadFromJson('/appSettings.json')
})

async function loadFromJson(path: string) {
    try {
        const res = await fetch(path)
        if (res.ok) {
            const jsonText = await res.text()
            text.value = jsonText
            save()
        } else {
            console.warn(`Failed to load ${path}:`, res.status)
        }
    } catch (err) {
        console.error(`Error loading ${path}:`, err)
    }
}

defineExpose({
    validate,
    save,
    clearInput,
    loadFromJson,
    errors,
    text,
    parsed,
} as SettingsAPI)
</script>

<template>
    <div>
        <label class="mb-2 block text-sm font-medium">App settings:</label>
        <textarea
            v-model="text"
            rows="18"
            class="w-full resize-y rounded-lg border-2 border-secondary bg-background p-2 font-mono text-xs"
            placeholder="{...}"
            @input="debouncedSave" />
        <div class="mt-2 flex gap-2">
            <BaseButton @click="save"> Reload </BaseButton>
            <BaseButton @click="clearInput"> Clear </BaseButton>
        </div>
        <div v-if="isValid" class="mt-3 text-sm text-accent">Valid</div>
        <div v-if="errors.length" class="mt-3 text-sm text-accent">
            <div class="font-medium">Errors:</div>
            <ul class="ml-5 list-disc">
                <li v-for="(err, i) in errors" :key="i">
                    {{ err }}
                </li>
            </ul>
        </div>
    </div>
</template>
