import type { NormalizedExportRecipe } from '../lib/normalizeExport'
import type { ExportStack } from './recipe'

export type ResultViewMode = 'exact' | 'output-index'

export interface OutputRecipeGroup {
    key: string
    output: ExportStack
    recipes: NormalizedExportRecipe[]
}