import type { ExportDocument } from '../types/recipe'
import { validateExportDocument } from './validateExport'

const RECIPES_URL = '/recipes.json'

export async function loadRecipeExport(): Promise<ExportDocument> {
    const response = await fetch(RECIPES_URL)

    if (!response.ok) {
        throw new Error(
            `Failed to load ${RECIPES_URL}: ${response.status} ${response.statusText}`,
        )
    }

    const value: unknown = await response.json()

    return validateExportDocument(value)
}
