import type { NormalizedExportRecipe } from '../lib/normalizeExport'
import type { ExportStack } from '../types/recipe'
import type { RecipeCatalog } from './recipeCatalog'
import { getStackKey } from './stackKey'

export interface MachineRecipeCount {
    machineId: string
    count: number
}

export function getProducerRecipesForStack(catalog: RecipeCatalog, stack: ExportStack): readonly NormalizedExportRecipe[] {
    const recipeIds =
        catalog.producerRecipeIdsByStackKey.get(
            getStackKey(stack),
        ) ?? []

    return resolveRecipes(catalog, recipeIds)
}

export function getConsumerRecipesForStack(catalog: RecipeCatalog, stack: ExportStack): readonly NormalizedExportRecipe[] {
    const recipeIds =
        catalog.consumerRecipeIdsByStackKey.get(
            getStackKey(stack)
        ) ?? []

    return resolveRecipes(catalog, recipeIds)
}

export function getRecipesForMachine(catalog: RecipeCatalog, machineId: string): readonly NormalizedExportRecipe[] {
    const recipeIds = catalog.recipeIdsByMachine.get(machineId) ?? []

    return resolveRecipes(catalog, recipeIds)
}

export function getMachineRecipeCounts(catalog: RecipeCatalog): readonly MachineRecipeCount[] {
    return Array.from(
        catalog.recipeIdsByMachine,
        ([machineId, recipeIds]) => ({
            machineId,
            count: recipeIds.length,
        }),
    ).sort((a, b) => b.count - a.count)
}

function resolveRecipes(catalog: RecipeCatalog, recipeIds: readonly string[]): readonly NormalizedExportRecipe[] {
    return recipeIds.map((recipeId) => {
        const recipe = catalog.recipesById.get(recipeId)

        if (!recipe) {
            throw new Error(
                `Catalog index references missing recipe: ${recipeId}`,
            )
        }

        return recipe
    })
}