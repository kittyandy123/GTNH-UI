import { describe, expect, it } from 'vitest'
import representativeExport from '../test/fixtures/schema-v2-representative.json'
import { validateExportDocument } from './validateExport'

describe('validateExportDocument', () => {
    it('accepts the exporter representative schema-v2 fixture', () => {
        expect(validateExportDocument(representativeExport))
            .toBe(representativeExport)
    })

    it('rejects unsupported schema versions with a clear error', () => {
        const unsupportedExport = {
            ...representativeExport,
            schemaVersion: 3,
        }

        expect(() => validateExportDocument(unsupportedExport))
            .toThrow(
                'Unsupported recipe export schema version: 3. Supported version: 2.',
            )
    })

    it('rejects malformed schema-v2 documents', () => {
        const malformedExport = {
            ...representativeExport,
            recipes: [
                {
                    ...representativeExport.recipes[0],
                    durationTicks: -1,
                },
            ],
        }

        expect(() => validateExportDocument(malformedExport))
            .toThrow('Recipe export failed schema-v2 validation:')
    })
})
