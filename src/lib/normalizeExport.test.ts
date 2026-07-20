import { describe, expect, it } from 'vitest'

import representativeExport from '../test/fixtures/schema-v2-representative.json'
import type { ExportDocument } from '../types/recipe'
import { normalizeExportDocument } from './normalizeExport'

function createDocument(): ExportDocument {
    return structuredClone(
        representativeExport,
    ) as unknown as ExportDocument
}

describe('normalizeExportDocument', () => {
    it('leaves positive-duration recipes plannable', () => {
        const normalized = normalizeExportDocument(
            createDocument(),
        )

        expect(normalized.recipes[0].planning).toBeUndefined()
        expect(normalized.diagnostics.nonPlannableRecipes).toBe(0)
        expect(normalized.diagnostics.nonPositiveDurationRecipes).toBe(0)
    })

    it('derives overflow classification from negative durations', () => {
        const document = createDocument()

        document.recipes[0].durationTicks = -2147483569
        document.recipes[0].durationSeconds = -107374178.45

        const normalized = normalizeExportDocument(document)
        const recipe = normalized.recipes[0]

        expect(recipe.planning).toEqual({
            supported: false,
            issues: [
                'negative-duration',
                'duration-overflow-suspected',
            ],
        })

        expect(normalized.diagnostics.nonPlannableRecipes).toBe(1)
        expect(normalized.diagnostics.nonPositiveDurationRecipes).toBe(1)
        expect(normalized.diagnostics.suspectedDurationOverflowRecipes).toBe(1)
        expect(normalized.diagnostics.nonPlannableRecipesByMachine).toEqual({
            'gregtech:mixer': 1,
        })
    })

    it ('derives zero-duration classification', () => {
        const document = createDocument()

        document.recipes[0].durationTicks = 0
        document.recipes[0].durationSeconds = 0

        const normalized = normalizeExportDocument(document)

        expect(normalized.recipes[0].planning).toEqual({
            supported: false,
            issues: ['zero-duration'],
        })

        expect(normalized.diagnostics.nonPlannableRecipes).toBe(1)
        expect(normalized.diagnostics.nonPositiveDurationRecipes).toBe(1)
        expect(normalized.diagnostics.suspectedDurationOverflowRecipes).toBe(0)
    })

    it ('augments incomplete exporter timing classification', () => {
        const document = createDocument()

        document.recipes[0].durationTicks = -2147483569
        document.recipes[0].durationSeconds = -107374178.45
        document.recipes[0].planning = {
            supported: false,
            issues: ['negative-duration'],
        }

        const normalized = normalizeExportDocument(document)

        expect(normalized.recipes[0].planning).toEqual({
            supported: false,
            issues: [
                'negative-duration',
                'duration-overflow-suspected',
            ],
        })
    })
})