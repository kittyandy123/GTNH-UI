import type { ExportRecipe, ExportStack } from '../types/recipe'

export type SearchMode = 'all' | 'inputs' | 'outputs' | 'machines' | 'ids'

interface ParsedSearchQuery {
    text: string
    isExact: boolean
}

export function recipeMatchesQuery(recipe: ExportRecipe, query: string, mode: SearchMode): boolean {
    const parsedQuery = parseSearchQuery(query)

    if (!parsedQuery.text) {
        return false
    }

    if (parsedQuery.isExact) {
        return recipeMatchesExactQuery(recipe, parsedQuery.text, mode)
    }

    return recipeMatchesFuzzyQuery(recipe, parsedQuery.text, mode)
}

function parseSearchQuery(query: string): ParsedSearchQuery {
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
        return {
            text: '',
            isExact: false,
        }
    }

    if (trimmedQuery.startsWith('+')) {
        return {
            text: trimmedQuery.slice(1).trim(),
            isExact: true,
        }
    }

    if (trimmedQuery.length >= 2 && trimmedQuery.startsWith('"') && trimmedQuery.endsWith('"')) {
        return {
            text: trimmedQuery.slice(1, -1).trim(),
            isExact: true,
        }
    }

    return {
        text: trimmedQuery,
        isExact: false,
    }
}

function recipeMatchesFuzzyQuery(recipe: ExportRecipe, query: string, mode: SearchMode): boolean {
    const tools = recipe.tools ?? []

    switch (mode) {
        case 'inputs':
            return recipe.inputs.some((stack) => stackMatchesFuzzyText(stack, query))
        case 'outputs':
            return recipe.outputs.some((stack) => stackMatchesFuzzyText(stack, query))
        case 'machines':
            return machineMatchesFuzzyQuery(recipe, query)
        case 'ids':
            return (
                recipeIdentityMatchesFuzzyQuery(recipe, query) ||
                tools.some((stack) => stackMatchesFuzzyIdentity(stack, query))
            )
        case 'all':
            return (
                recipe.id.toLowerCase().includes(query) ||
                machineMatchesFuzzyQuery(recipe, query) ||
                recipe.inputs.some((stack) => stackMatchesFuzzyText(stack, query)) ||
                tools.some((stack) => stackMatchesFuzzyText(stack, query)) ||
                recipe.outputs.some((stack) => stackMatchesFuzzyText(stack, query))
            )
    }
}

function recipeMatchesExactQuery(recipe: ExportRecipe, query: string, mode: SearchMode): boolean {
    const tools = recipe.tools ?? []

    switch (mode) {
        case 'inputs':
            return recipe.inputs.some((stack) => stackMatchesExactText(stack, query))
        case 'outputs':
            return recipe.outputs.some((stack) => stackMatchesExactText(stack, query))
        case 'machines':
            return machineMatchesExactQuery(recipe, query)
        case 'ids':
            return (
                recipeIdentityMatchesExactQuery(recipe, query) ||
                tools.some((stack) => stackMatchesExactIdentity(stack, query))
            )
        case 'all':
            return (
                recipe.id.toLowerCase() === query ||
                machineMatchesExactQuery(recipe, query) ||
                recipe.inputs.some((stack) => stackMatchesExactText(stack, query)) ||
                tools.some((stack) => stackMatchesExactText(stack, query)) ||
                recipe.outputs.some((stack) => stackMatchesExactText(stack, query))
            )
    }
}

function machineMatchesFuzzyQuery(recipe: ExportRecipe, query: string): boolean {
    return (
        recipe.machine.id.toLowerCase().includes(query) ||
        recipe.machine.name.toLowerCase().includes(query) ||
        recipe.machine.category.toLowerCase().includes(query)
    )
}

function machineMatchesExactQuery(recipe: ExportRecipe, query: string): boolean {
    return (
        recipe.machine.id.toLowerCase() === query ||
        recipe.machine.name.toLowerCase() === query ||
        recipe.machine.category.toLowerCase() === query
    )
}

function recipeIdentityMatchesFuzzyQuery(recipe: ExportRecipe, query: string): boolean {
    return (
        recipe.id.toLowerCase().includes(query) ||
        recipe.machine.id.toLowerCase().includes(query) ||
        recipe.inputs.some((stack) => stackMatchesFuzzyIdentity(stack, query)) ||
        recipe.outputs.some((stack) => stackMatchesFuzzyIdentity(stack, query))
    )
}

function recipeIdentityMatchesExactQuery(recipe: ExportRecipe, query: string): boolean {
    return (
        recipe.id.toLowerCase() === query ||
        recipe.machine.id.toLowerCase() === query ||
        recipe.inputs.some((stack) => stackMatchesExactIdentity(stack, query)) ||
        recipe.outputs.some((stack) => stackMatchesExactIdentity(stack, query))
    )
}

function stackMatchesFuzzyText(stack: ExportStack, query: string): boolean {
    return (
        stack.id.toLowerCase().includes(query) ||
        stack.displayName.toLowerCase().includes(query) ||
        stackMatchesFuzzyIdentity(stack, query)
    )
}

function stackMatchesExactText(stack: ExportStack, query: string): boolean {
    return (
        stack.id.toLowerCase() === query ||
        stack.displayName.toLowerCase() === query ||
        stackMatchesExactIdentity(stack, query)
    )
}

function stackMatchesFuzzyIdentity(stack: ExportStack, query: string): boolean {
    return (
        stack.kind.toLowerCase().includes(query) ||
        stack.id.toLowerCase().includes(query) ||
        formatStackIdentity(stack).toLowerCase().includes(query)
    )
}

function stackMatchesExactIdentity(stack: ExportStack, query: string): boolean {
    const stackKind = stack.kind.toLowerCase()
    const stackIdentity = formatStackIdentity(stack).toLowerCase()

    return (
        stackKind === query ||
        stack.id.toLowerCase() === query ||
        stackIdentity === query ||
        `${stackKind}:${stackIdentity}` === query
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

export function formatExactStackSearchToken(stack: ExportStack): string {
    return `+${formatStackSearchToken(stack)}`
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