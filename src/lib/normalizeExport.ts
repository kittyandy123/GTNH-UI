import type { ExportDocument, ExportRecipe, ExportStack } from '../types/recipe'

export interface NormalizedExportDocument extends Omit<ExportDocument, 'recipes'> {
    recipes: NormalizedExportRecipe[]
}

export interface NormalizedExportRecipe extends Omit<ExportRecipe, 'tools'> {
    tools: ExportStack[]
}

export function normalizeExportDocument(document: ExportDocument): NormalizedExportDocument {
    return {
        ...document,
        recipes: document.recipes.map((recipe) =>
        normalizedRecipe(recipe, document.schemaVersion))
    }
}

function normalizedRecipe(recipe: ExportRecipe, schemaVersion: number): NormalizedExportRecipe {
    if (schemaVersion >= 2) {
        return {
            ...recipe,
            tools: recipe.tools ?? [],
        }
    }

    const inputs: ExportStack[] = []
    const tools: ExportStack[] = []

    for (const stack of recipe.inputs) {
        if (isLegacyToolStack(stack)) {
            tools.push({
                ...stack,
                amount: stack.amount > 0 ? stack.amount : 1,
            })
        } else {
            inputs.push(stack)
        }
    }

    return {
        ...recipe,
        inputs,
        tools: [...tools, ...(recipe.tools ?? [])],
    }
}

function isLegacyToolStack(stack: ExportStack): boolean {
    return stack.kind === 'item' && stack.amount <= 0
}