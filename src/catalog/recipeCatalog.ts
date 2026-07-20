import type {
    NormalizedExportDocument,
    NormalizedExportRecipe,
} from '../lib/normalizeExport'
import type { ExportStack } from '../types/recipe'
import {
    getStackKey,
    type StackKey,
} from './stackKey'

export interface RecipeCatalog {
    readonly document: NormalizedExportDocument
    readonly allRecipeIds: readonly string[]

    readonly recipesById: ReadonlyMap<string, NormalizedExportRecipe>

    readonly recipeIdsByMachine: ReadonlyMap<string, readonly string[]>

    readonly producerRecipeIdsByStackKey: ReadonlyMap<StackKey, readonly string[]>

    readonly consumerRecipeIdsByStackKey: ReadonlyMap<StackKey, readonly string[]>

    readonly toolRecipeIdsByStackKey: ReadonlyMap<StackKey, readonly string[]>
}

export function buildRecipeCatalog(document: NormalizedExportDocument): RecipeCatalog {
    const allRecipeIds: string[] = []

    const recipesById = new Map<string, NormalizedExportRecipe>()

    const recipeIdsByMachine = new Map<string, Set<string>>()

    const producerRecipeIdsByStackKey = new Map<StackKey, Set<string>>()

    const consumerRecipeIdsByStackKey = new Map<StackKey, Set<string>>()

    const toolRecipeIdsByStackKey = new Map<StackKey, Set<string>>()

    for (const recipe of document.recipes) {
        if (recipesById.has(recipe.id)) {
            throw new Error(
                `Duplicate recipe ID in catalog: ${recipe.id}`,
            )
        }

        allRecipeIds.push(recipe.id)
        recipesById.set(recipe.id, recipe)

        addRecipeId(
            recipeIdsByMachine,
            recipe.machine.id,
            recipe.id,
        )

        indexStacks(
            producerRecipeIdsByStackKey,
            recipe.outputs,
            recipe.id,
        )

        indexStacks(
            consumerRecipeIdsByStackKey,
            recipe.inputs,
            recipe.id,
        )

        indexStacks(
            toolRecipeIdsByStackKey,
            recipe.tools,
            recipe.id,
        )
    }

    return {
        document,
        allRecipeIds: Object.freeze([...allRecipeIds]),
        recipesById,
        recipeIdsByMachine: finalizeRecipeIdIndex(recipeIdsByMachine),
        producerRecipeIdsByStackKey: finalizeRecipeIdIndex(producerRecipeIdsByStackKey),
        consumerRecipeIdsByStackKey: finalizeRecipeIdIndex(consumerRecipeIdsByStackKey),
        toolRecipeIdsByStackKey: finalizeRecipeIdIndex(toolRecipeIdsByStackKey),
    }
}

function indexStacks(index: Map<StackKey, Set<string>>, stacks: readonly ExportStack[], recipeId: string): void {
    const uniqueKeys = new Set(stacks.map((stack) => getStackKey(stack)))

    for (const key of uniqueKeys) {
        addRecipeId(index, key, recipeId)
    }
}

function addRecipeId<Key>(index: Map<Key, Set<string>>, key: Key, recipeId: string): void {
    const existingIds = index.get(key)

    if (existingIds) {
        existingIds.add(recipeId)
        return
    }

    index.set(key, new Set([recipeId]))
}

function finalizeRecipeIdIndex<Key>(index: Map<Key, Set<string>>): ReadonlyMap<Key, readonly string[]> {
    return new Map(
        Array.from(
            index,
            ([key, recipeIds]) => [
                key,
                Object.freeze([...recipeIds]),
            ],
        ),
    )
}
