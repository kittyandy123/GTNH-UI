export interface ExportDocument {
    schemaVersion: number
    pack: PackInfo
    export: ExportInfo
    diagnostics: ExportDiagnostics
    recipes: ExportRecipe[]
}

export interface PackInfo {
    name: string
    minecraftVersion: string
}

export interface ExportInfo {
    source: string
    exporterVersion: string
    exportedAt: string
}

export interface ExportDiagnostics {
    totalRecipes: number
    duplicateRecipesSkipped: number
    displayNameFallbacks: number
    displayNameFallbackItems: string[]
    recipesSkippedDueToError: number
    recipeErrorsByMachine: Record<string, number>
    recipeCountsByMachine: Record<string, number>

    toolInputsExtracted: number
    toolInputsByMachine: Record<string, number>
    zeroAmountInputsMovedToTools: number
    zeroAmountInputsRemaining: number
    inferredToolAmounts: number
    sampleToolInputs: string[]
    nonPlannableRecipes?: number
    nonPlannableRecipesByMachine?: Record<string, number>
    nonPositiveDurationRecipes?: number
    suspectedDurationOverflowRecipes?: number
    suspectedSentinelDurationRecipes?: number
    sampleNonPlannableRecipes?: string[]
}

export type RecipePlanningIssue =
    | 'negative-duration'
    | 'zero-duration'
    | 'duration-overflow-suspected'
    | 'sentinel-duration-suspected'

export interface RecipePlanningInfo {
    supported: false
    issues: RecipePlanningIssue[]
}

export interface ExportRecipe {
    id: string
    machine: MachineInfo
    durationTicks: number
    durationSeconds: number
    eut: number
    inputs: ExportStack[]
    tools?: ExportStack[]
    outputs: ExportStack[]
    planning?: RecipePlanningInfo
    metadata: RecipeMetadata
}

export interface MachineInfo {
    id: string
    name: string
    category: string
}

export interface ExportStack {
    kind: 'item' | 'fluid'
    id: string
    meta: number
    displayName: string
    amount: number
    unit: 'items' | 'L'
    chance?: number
}

export interface RecipeMetadata {
    circuit?: number
    hidden?: boolean
    fakeRecipe?: boolean
    specialValue?: number
    needsEmptyOutput?: boolean
    nbtSensitive?: boolean
    recipeMap?: string
    recipeMapUnlocalizedName?: string
    recipeCategory?: string
    neiDescription?: string
}