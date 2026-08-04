import type { NormalizedExportRecipe } from '../lib/normalizeExport'
import type { SearchMode } from '../lib/recipeHelpers'
import { recipeSearchRecordMatchesQuery } from './recipeSearchRecord'
import type { ExportStack } from '../types/recipe'
import type { RecipeCatalog } from './recipeCatalog'
import { getStackKey } from './stackKey'

export interface MachineRecipeCount {
  machineId: string
  count: number
}

export function getProducerRecipesForStack(
  catalog: RecipeCatalog,
  stack: ExportStack,
): readonly NormalizedExportRecipe[] {
  const recipeIds = catalog.producerRecipeIdsByStackKey.get(getStackKey(stack)) ?? []

  return resolveRecipes(catalog, recipeIds)
}

export function getConsumerRecipesForStack(
  catalog: RecipeCatalog,
  stack: ExportStack,
): readonly NormalizedExportRecipe[] {
  const recipeIds = catalog.consumerRecipeIdsByStackKey.get(getStackKey(stack)) ?? []

  return resolveRecipes(catalog, recipeIds)
}

export function getRecipesForMachine(
  catalog: RecipeCatalog,
  machineId: string,
): readonly NormalizedExportRecipe[] {
  const recipeIds = catalog.recipeIdsByMachine.get(machineId) ?? []

  return resolveRecipes(catalog, recipeIds)
}

export function getMachineRecipeCounts(catalog: RecipeCatalog): readonly MachineRecipeCount[] {
  return Array.from(catalog.recipeIdsByMachine, ([machineId, recipeIds]) => ({
    machineId,
    count: recipeIds.length,
  })).sort((a, b) => b.count - a.count)
}

export function searchRecipes(
  catalog: RecipeCatalog,
  recipes: readonly NormalizedExportRecipe[],
  normalizedQuery: string,
  mode: SearchMode,
): readonly NormalizedExportRecipe[] {
  return recipes.filter((recipe) => {
    const searchRecord = catalog.searchRecordsByRecipeId.get(recipe.id)

    if (!searchRecord) {
      throw new Error(`Catalog is missing search record for recipe: ${recipe.id}`)
    }

    return recipeSearchRecordMatchesQuery(searchRecord, normalizedQuery, mode)
  })
}

function resolveRecipes(
  catalog: RecipeCatalog,
  recipeIds: readonly string[],
): readonly NormalizedExportRecipe[] {
  return recipeIds.map((recipeId) => {
    const recipe = catalog.recipesById.get(recipeId)

    if (!recipe) {
      throw new Error(`Catalog index references missing recipe: ${recipeId}`)
    }

    return recipe
  })
}
