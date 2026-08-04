import type { ExportDocument } from '../types/recipe'
import { validateExportDocument } from './validateExport'

const RECIPES_URL = '/recipes.json'

export function parseRecipeExportText(text: string, sourceLabel: string): ExportDocument {
  let value: unknown

  try {
    value = JSON.parse(text) as unknown
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Invalid JSON'

    throw new Error(`Failed to parse ${sourceLabel} as JSON: ${detail}`, {
      cause: error,
    })
  }

  return validateExportDocument(value)
}

export async function loadRecipeExport(): Promise<ExportDocument> {
  const response = await fetch(RECIPES_URL)

  if (!response.ok) {
    throw new Error(`Failed to load ${RECIPES_URL}: ${response.status} ${response.statusText}`)
  }

  const text = await response.text()

  return parseRecipeExportText(text, RECIPES_URL)
}

export async function loadRecipeExportFile(file: File): Promise<ExportDocument> {
  const text = await file.text()

  return parseRecipeExportText(text, file.name)
}
