import type { ExportRecipe, ExportStack } from '../types/recipe'

export type SearchMode = 'all' | 'inputs' | 'outputs' | 'machines' | 'ids'

export function recipeMatchesQuery(recipe: ExportRecipe, query: string, mode: SearchMode): boolean {
    const tools = recipe.tools ?? []

    switch (mode) {
        case 'inputs':
            return recipe.inputs.some((stack) => stackMatchesText(stack, query))
        case 'outputs':
            return recipe.outputs.some((stack) => stackMatchesText(stack, query))
        case 'machines':
            return machineMatchesQuery(recipe, query)
        case 'ids':
            return (
                recipeIdentityMatchesQuery(recipe, query) ||
                    tools.some((stack) => stackMatchesIdentity(stack, query))
            )
        case 'all':
            return (
                recipe.id.toLowerCase().includes(query) ||
                machineMatchesQuery(recipe, query) ||
                recipe.inputs.some((stack) => stackMatchesText(stack, query)) ||
                tools.some((stack) => stackMatchesText(stack, query)) ||
                recipe.outputs.some((stack) => stackMatchesText(stack, query))
            )
    }
}

function machineMatchesQuery(recipe: ExportRecipe, query: string): boolean {
    return (
        recipe.machine.id.toLowerCase().includes(query) ||
        recipe.machine.name.toLowerCase().includes(query) ||
        recipe.machine.category.toLowerCase().includes(query)
    )
}

function recipeIdentityMatchesQuery(recipe: ExportRecipe, query: string): boolean {
    return (
        recipe.id.toLowerCase().includes(query) ||
        recipe.machine.id.toLowerCase().includes(query) ||
        recipe.inputs.some((stack) => stackMatchesIdentity(stack, query)) ||
        recipe.outputs.some((stack) => stackMatchesIdentity(stack, query))
    )
}

function stackMatchesText(stack: ExportStack, query: string): boolean {
    return (
        stack.id.toLowerCase().includes(query) ||
        stack.displayName.toLowerCase().includes(query) ||
        stackMatchesIdentity(stack, query)
    )
}

function stackMatchesIdentity(stack: ExportStack, query: string): boolean {
    return (
        stack.kind.toLowerCase().includes(query) ||
        stack.id.toLowerCase().includes(query) ||
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

    return parts.join(' · ')
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

export function formatStackSearchToken(stack: ExportStack): string {
    if (stack.kind === 'fluid') {
        return stack.id
    }

    return `${stack.id}:${stack.meta}`
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

export function formatStackRate(stack: ExportStack, durationSeconds: number): string {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        return `? ${stack.unit}/s`
    }

    const rate = stack.amount / durationSeconds

    return `${formatDecimal(rate)} ${stack.unit}/s`
}

export function formatDecimal(value: number): string {
    return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 3,
    }).format(value)
}

export function formatMachineSummary(recipes: ExportRecipe[]): string {
    const machineNames = Array.from(
        new Set(recipes.map((recipe) => recipe.machine.name)),
    )

    if (machineNames.length <= 3) {
        return machineNames.join(', ')
    }

    return `${machineNames.slice(0, 3).join(', ')} + ${machineNames.length - 3} more`
}