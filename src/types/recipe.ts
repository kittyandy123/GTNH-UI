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
}

export interface ExportRecipe {
    id: string
    machine: MachineInfo
    durationTicks: number
    durationSeconds: number
    eut: number
    inputs: ExportStack[]
    outputs: ExportStack[]
    metadata: RecipeMetadata
}

export interface MachineInfo {
    id: string
    name: string
    category: string
}

export interface ExportStack {
    kind: 'item' | 'fluid' | string
    id: string
    meta: number
    displayName: string
    amount: number
    unit: 'items' | 'L' | string
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