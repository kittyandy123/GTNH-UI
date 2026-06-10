import type { ExportRecipe, ExportStack } from '../types/recipe'

export function recipeMatchesQuery(recipe: ExportRecipe, query: string): boolean {
    return (
        recipe.id.toLowerCase().includes(query) ||
        recipe.machine.id.toLowerCase().includes(query) ||
        recipe.machine.name.toLowerCase().includes(query) ||
        recipe.machine.category.toLowerCase().includes(query) ||
        recipe.inputs.some((stack) => stackMatchesQuery(stack, query)) ||
        recipe.outputs.some((stack) => stackMatchesQuery(stack, query))
    )
}

function stackMatchesQuery(stack: ExportStack, query: string): boolean {
    return (
        stack.id.toLowerCase().includes(query) ||
        stack.displayName.toLowerCase().includes(query) ||
        `${stack.id}:${stack.meta}`.toLowerCase().includes(query)
    )
}

export function normalizeSearchText(value: string): string {
    return value.trim().toLowerCase()
}

export function formatRecipeStats(recipe: ExportRecipe): string {
    const parts = [`${recipe.durationSeconds}s`]

    if (recipe.eut !== 0) {
        parts.push(`${recipe.eut} EU/t`)
    }

    if (recipe.metadata.circuit !== undefined) {
        parts.push(`circuit ${recipe.metadata.circuit}`)
    }

    return parts.join(' . ')
}

export function formatStackCompact(stack: ExportStack): string {
    return `${formatStackAmount(stack)} ${stack.displayName}`
}

export function formatStackAmount(stack: ExportStack): string {
    return `${formatNumber(stack.amount)} ${stack.unit}`
}

export function formatStackIdentity(stack: ExportStack): string {
    if (stack.kind === 'item') {
        return `${stack.id}:${stack.meta}`
    }

    return stack.id
}

export function formatNumber(value: number): string {
    return new Intl.NumberFormat().format(value)
}

export function formatDate(value: string): string {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleString()
}