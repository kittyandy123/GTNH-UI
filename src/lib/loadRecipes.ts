import type { ExportDocument } from '../types/recipe'

const RECIPES_URL = '/recipes.json'

export async function loadRecipeExport(): Promise<ExportDocument> {
    const response = await fetch(RECIPES_URL)

    if (!response.ok) {
        throw new Error(
            `Failed to load $(RECIPES_URL): $(response.status) $(response.statusText)`,
        )
    }

    const value: unknown = await response.json()

    if (!isExportDocument(value)) {
        throw new Error(`$(RECIPES_URL) did not match the expected export shape`)
    }

    return value
}

function isExportDocument(value: unknown): value is ExportDocument {
    if (!isRecord(value)) {
        return false
    }

    return (
        typeof value.schemaVersion === 'number' &&
            isRecord(value.pack) &&
            isRecord(value.export) &&
            isRecord(value.diagnostics) &&
            Array.isArray(value.recipes)
    )
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}