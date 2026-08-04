import {
  describe,
  expect,
  it,
} from 'vitest'
import representativeExport from '../test/fixtures/schema-v2-representative.json'
import {
  parseRecipeExportText,
} from './loadRecipes'

describe('parseRecipeExportText', () => {
  it('parses and validates a schema-v2 export', () => {
    const result = parseRecipeExportText(
      JSON.stringify(representativeExport),
      'representative.json',
    )

    expect(result).toEqual(
      representativeExport,
    )
  })

  it('reports invalid JSON with its source label', () => {
    expect(() =>
      parseRecipeExportText(
        '{"schemaVersion":',
        'broken.json',
      ),
    ).toThrow(
      'Failed to parse broken.json as JSON:',
    )
  })

  it('validates the parsed export document', () => {
    const unsupportedExport = {
      ...representativeExport,
      schemaVersion: 3,
    }

    expect(() =>
      parseRecipeExportText(
        JSON.stringify(
          unsupportedExport,
        ),
        'unsupported.json',
      ),
    ).toThrow(
      'Unsupported recipe export schema version: 3.',
    )
  })
})
