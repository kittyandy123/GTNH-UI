import type { NormalizedExportRecipe } from '../lib/normalizeExport'
import {
    formatStackIdentity,
    parseSearchQuery,
    type SearchMode,
} from '../lib/recipeHelpers'
import type { ExportStack } from '../types/recipe'

export interface StackSearchRecord {
    readonly kindText: string
    readonly idText: string
    readonly displayNameText: string
    readonly identityText: string
    readonly kindIdentityText: string
}

export interface RecipeSearchRecord {
    readonly recipeIdText: string
    readonly machineIdText: string
    readonly machineNameText: string
    readonly machineCategoryText: string
    readonly inputs: readonly StackSearchRecord[]
    readonly tools: readonly StackSearchRecord[]
    readonly outputs: readonly StackSearchRecord[]
}

export function buildRecipeSearchRecord(recipe: NormalizedExportRecipe): RecipeSearchRecord {
    return Object.freeze({
        recipeIdText: recipe.id.toLowerCase(),
        machineIdText: recipe.machine.id.toLowerCase(),
        machineNameText: recipe.machine.name.toLowerCase(),
        machineCategoryText: recipe.machine.category.toLowerCase(),
        inputs: buildStackSearchRecords(recipe.inputs),
        tools: buildStackSearchRecords(recipe.tools),
        outputs: buildStackSearchRecords(recipe.outputs),
    })
}

export function recipeSearchRecordMatchesQuery(record: RecipeSearchRecord, query: string, mode: SearchMode): boolean {
    const parsedQuery = parseSearchQuery(query)

    if (!parsedQuery.text) {
        return false
    }

    if (parsedQuery.isExact) {
        return recordMatchesExactQuery(
            record,
            parsedQuery.text,
            mode,
        )
    }

    return recordMatchesFuzzyQuery(
        record,
        parsedQuery.text,
        mode,
    )
}

function buildStackSearchRecords(stacks: readonly ExportStack[]): readonly StackSearchRecord[] {
    return Object.freeze(
        stacks.map((stack) =>
          buildStackSearchRecord(stack),
        ),
    )
}

function buildStackSearchRecord(stack: ExportStack): StackSearchRecord {
    const kindText = stack.kind.toLowerCase()
    const identityText = formatStackIdentity(stack).toLowerCase()

    return Object.freeze({
        kindText,
        idText: stack.id.toLowerCase(),
        displayNameText: stack.displayName.toLowerCase(),
        identityText,
        kindIdentityText: `${kindText}:${identityText}`,
    })
}

function recordMatchesFuzzyQuery(record: RecipeSearchRecord, query: string, mode: SearchMode): boolean {
    switch (mode) {
        case 'inputs':
            return record.inputs.some((stack) =>
                stackMatchesFuzzyText(stack, query),
            )

        case 'outputs':
            return record.outputs.some((stack) =>
                stackMatchesFuzzyText(stack, query),
            )

        case 'machines':
            return machineMatchesFuzzyQuery(
                record,
                query,
            )

        case 'ids':
            return (
                record.recipeIdText.includes(query) ||
                record.machineIdText.includes(query) ||
                record.inputs.some((stack) =>
                  stackMatchesFuzzyIdentity(
                      stack,
                      query,
                  ),
                ) ||
                record.tools.some((stack) =>
                  stackMatchesFuzzyIdentity(
                      stack,
                      query,
                  ),
                ) ||
                record.outputs.some((stack) =>
                  stackMatchesFuzzyIdentity(
                      stack,
                      query,
                  ),
                )
            )

        case 'all':
            return (
                record.recipeIdText.includes(query) ||
                machineMatchesFuzzyQuery(
                    record,
                    query,
                ) ||
                record.inputs.some((stack) =>
                  stackMatchesFuzzyText(stack, query),
                ) ||
                record.tools.some((stack) =>
                  stackMatchesFuzzyText(stack, query),
                ) ||
                record.outputs.some((stack) =>
                  stackMatchesFuzzyText(stack, query),
                )
            )
    }
}

function recordMatchesExactQuery(record: RecipeSearchRecord, query: string, mode: SearchMode): boolean {
    switch (mode) {
        case 'inputs':
            return record.inputs.some((stack) =>
             stackMatchesExactText(stack, query),
            )

        case 'outputs':
            return record.outputs.some((stack) =>
                stackMatchesExactText(
                    stack,
                    query,
                ),
            )

        case 'machines':
            return machineMatchesExactQuery(
                record,
                query,
            )

        case 'ids':
            return (
                record.recipeIdText === query ||
                record.machineIdText === query ||
                record.inputs.some((stack) =>
                  stackMatchesExactIdentity(stack, query),
                ) ||
                record.tools.some((stack) =>
                  stackMatchesExactIdentity(stack, query),
                ) ||
                record.outputs.some((stack) =>
                  stackMatchesExactIdentity(stack, query),
                )
            )

        case 'all':
            return (
                record.recipeIdText === query ||
                machineMatchesExactQuery(record, query) ||
                record.inputs.some((stack) =>
                  stackMatchesExactText(stack, query),
                ) ||
                record.tools.some((stack) =>
                  stackMatchesExactText(stack, query),
                ) ||
                record.outputs.some((stack) =>
                  stackMatchesExactText(stack, query),
                )
            )
    }
}

function machineMatchesFuzzyQuery(record: RecipeSearchRecord, query: string): boolean {
    return (
        record.machineIdText.includes(query) ||
        record.machineNameText.includes(query) ||
        record.machineCategoryText.includes(query)
    )
}

function machineMatchesExactQuery(record: RecipeSearchRecord, query: string): boolean {
    return (
        record.machineIdText === query ||
        record.machineNameText === query ||
        record.machineCategoryText === query
    )
}

function stackMatchesFuzzyText(stack: StackSearchRecord, query: string): boolean {
    return (
        stack.idText.includes(query) ||
        stack.displayNameText.includes(query) ||
        stackMatchesFuzzyIdentity(stack, query)
    )
}

function stackMatchesExactText(stack: StackSearchRecord, query: string): boolean {
    return (
        stack.idText === query ||
        stack.displayNameText === query ||
        stackMatchesExactIdentity(stack, query)
    )
}

function stackMatchesFuzzyIdentity(stack: StackSearchRecord, query: string): boolean {
    return (
        stack.kindText.includes(query) ||
        stack.idText.includes(query) ||
        stack.identityText.includes(query)
    )
}

function stackMatchesExactIdentity(stack: StackSearchRecord, query: string): boolean {
    return (
        stack.kindText === query ||
        stack.idText === query ||
        stack.identityText === query ||
        stack.kindIdentityText === query
    )
}