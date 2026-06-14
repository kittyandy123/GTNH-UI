import type { NormalizedExportRecipe } from '../../lib/normalizeExport'

export interface PlannerDraft {
    recipeId: string
    targetOutputIndex: number
    targetRatePerSecond?: number
}

export function createPlannerDraft(recipe: NormalizedExportRecipe): PlannerDraft {
    return {
        recipeId: recipe.id,
        targetOutputIndex: 0,
    }
}