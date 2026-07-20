import { formatStackIdentity, normalizeSearchText } from './recipeHelpers'
import type { NormalizedExportRecipe } from './normalizeExport'
import type { OutputRecipeGroup } from '../types/recipeBrowser'
import { getStackKey } from '../catalog/stackKey'

export function buildOutputGroups(recipes: NormalizedExportRecipe[], searchText: string): OutputRecipeGroup[] {
    const query = normalizeSearchText(searchText)
    const groups = new Map<string, OutputRecipeGroup>()

    for (const recipe of recipes) {
        for (const output of recipe.outputs) {
            const key = getStackKey(output)
            const existingGroup = groups.get(key)

            if (existingGroup) {
                existingGroup.recipes.push(recipe)
                continue
            }

            groups.set(key, {
                key,
                output,
                recipes: [recipe],
            })
        }
    }

    return Array.from(groups.values()).sort((left, right) =>
      compareOutputGroups(left, right, query),
    )
}

function compareOutputGroups(left: OutputRecipeGroup, right: OutputRecipeGroup, query: string): number {
    const relevanceComparison = getOutputGroupRelevance(right, query) - getOutputGroupRelevance(left, query)

    if (relevanceComparison !== 0) {
        return relevanceComparison
    }

    if (query) {
        const countComparison = right.recipes.length - left.recipes.length

        if (countComparison !== 0) {
            return countComparison
        }
    }

    const nameComparison = left.output.displayName.localeCompare(right.output.displayName)

    if (nameComparison !== 0) {
        return nameComparison
    }

    return right.recipes.length - left.recipes.length
}

function getOutputGroupRelevance(group: OutputRecipeGroup, query: string): number {
    if (!query) {
        return 0
    }

    const values = [
        group.output.displayName,
        group.output.id,
        formatStackIdentity(group.output),
    ].map((value) => value.toLowerCase())

    if (values.some((value) => value === query)) {
        return 4
    }

    if (values.some((value) => value.startsWith(query))) {
        return 3
    }

    if (values.some((value) => value.includes(query))) {
        return 2
    }

    return 0
}