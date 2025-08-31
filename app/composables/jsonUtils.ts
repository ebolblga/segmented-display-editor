export function stringifyCompactArrays(obj: any, space = 2): string {
    return (
        JSON.stringify(obj, (key, value) => value, space)
            // collapse simple number/boolean/string arrays
            .replace(/\[\s+(-?\d+(?:,\s+-?\d+)*?)\s+\]/g, (match) => {
                return match.replace(/\s+/g, ' ')
            })
            .replace(/\[\s+"([^"]+)"(?:,\s+"[^"]+")*\s+\]/g, (match) => {
                return match.replace(/\s+/g, ' ')
            })
    )
}

type TruthTable = Record<string, number[]>

export function findExactGroups(truthTable: TruthTable): number[][] {
    const labels = Object.keys(truthTable)
    if (labels.length === 0) {
        return []
    }

    const firstRow = truthTable[labels[0] as string]
    if (!firstRow) return []
    const m = firstRow.length

    // collect the column vector for each segment
    const patterns: string[] = []
    for (let s = 0; s < m; s++) {
        const pattern = labels.map((label) => truthTable[label]![s]).join(',')
        patterns.push(pattern)
    }

    // group segments with identical patterns
    const groups: number[][] = []
    const seen: boolean[] = Array(m).fill(false)

    for (let i = 0; i < m; i++) {
        if (seen[i]) continue
        const group = [i]
        for (let j = i + 1; j < m; j++) {
            if (patterns[i] === patterns[j]) {
                group.push(j)
                seen[j] = true
            }
        }
        if (group.length > 1) {
            groups.push(group)
        }
    }

    return groups
}
