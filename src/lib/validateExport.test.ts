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

    it('accepts schema-v2 exports with classified raw negative durations', () => {
        const negativeDurationExport = {
            ...representativeExport,
            recipes: [
                {
                    ...representativeExport.recipes[0],
                    durationTicks: -2147483569,
                    durationSeconds: -107374178.45,
                    planning: {
                        supported: false,
                        issues: [
                            'negative-duration',
                            'duration-overflow-suspected',
                        ],
                    },
                },
            ],
        }

        expect(
            validateExportDocument(negativeDurationExport),
        ).toBe(negativeDurationExport)
    })

    it('accepts classified sentinel-duration recipes', () => {
        const sentinelDurationExport = {
            ...representativeExport,
            recipes: [
                {
                    ...representativeExport.recipes[0],
                    durationTicks: 2_147_483_647,
                    durationSeconds:  2_147_483_647 / 20,
                    planning: {
                        supported: false,
                        issues: [
                            'sentinel-duration-suspected',
                        ],
                    },
                },
            ],
        }

        expect(validateExportDocument(sentinelDurationExport)).toBe(sentinelDurationExport)
    })

    it('rejects malformed schema-v2 documents', () => {
        const malformedExport = {
            ...representativeExport,
            recipes: [
                {
                    ...representativeExport.recipes[0],
                    outputs: [
                        {
                            ...representativeExport.recipes[0].outputs[0],
                            amount: -1,
                        },
                    ],
                },
            ],
        }

        expect(() => validateExportDocument(malformedExport))
            .toThrow('Recipe export failed schema-v2 validation:')
    })
})
