import type { ExportStack } from '../types/recipe'

export type StackKey =
    | `item:${string}:${number}`
    | `fluid:${string}`

export function getStackKey(stack: Pick<ExportStack, 'kind' | 'id' | 'meta'>): StackKey {
    if (stack.kind === 'fluid') {
        return `fluid:${stack.id}`
    }

    return `item:${stack.id}:${stack.meta}`
}
