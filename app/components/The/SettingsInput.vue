<script setup lang="ts">
import type { AppSettings } from '@types'
import { useDebounceFn } from '@vueuse/core';

const props = defineProps<{ storageKey?: string }>()
const emit = defineEmits<{ (e: 'update:settings', settings: AppSettings): void }>()

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
        baseUrl: '',
        numSegments: 0,
        segmentWidth: 0,
        segmentHeight: 0,
        truthTable: {},
    }

    // required fields
    if (typeof obj.baseUrl !== 'string') {
        errors.value.push('baseUrl must be a string.')
    } else {
        out.baseUrl = obj.baseUrl
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

    // truthTable validation
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

    if (errors.value.length === 0) {
        parsed.value = out
        return true
    }
    return false
}

const debouncedSave = useDebounceFn(save, 500);

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
            validate()
            return
        }
    }

    // nothing in localStorage → try to load /appSettings.json
    try {
        const res = await fetch('/appSettings.json')
        if (res.ok) {
            const jsonText = await res.text()
            text.value = jsonText
            validate()
        } else {
            console.warn('Failed to load /appSettings.json:', res.status)
        }
    } catch (err) {
        console.error('Error loading /appSettings.json:', err)
    }
})

defineExpose({ validate, save, clearInput, errors, text, parsed })
</script>
<template>
    <div>
        <label class="block text-sm font-medium mb-2">App settings:</label>
        <textarea
            v-model="text"
            rows="15"
            class="w-full p-2 border-2 rounded-lg border-secondary resize-y text-xs font-mono bg-background"
            @input="debouncedSave"
            placeholder='{"baseUrl": "...", "numSegments": 4, "segmentWidth": 5, "segmentHeight": 9, "truthTable": {...}}'></textarea>

        <div class="mt-2 flex gap-2">
            <button
                type="button"
                @click="save"
                class="px-3 py-1 rounded bg-gray-700 text-white text-sm">
                Save
            </button>

            <button
                type="button"
                @click="clearInput"
                class="px-3 py-1 rounded bg-gray-200 text-sm">
                Clear
            </button>

            <div v-if="isValid" class="ml-auto text-sm text-green-700">
                Valid
            </div>
        </div>

        <div v-if="errors.length" class="mt-3 text-sm text-red-600">
            <div class="font-medium">Errors:</div>
            <ul class="list-disc ml-5">
                <li v-for="(err, i) in errors" :key="i">{{ err }}</li>
            </ul>
        </div>
    </div>
</template>
