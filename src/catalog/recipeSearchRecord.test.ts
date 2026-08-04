import { describe, expect, it } from 'vitest'
import representativeExport from '../test/fixtures/schema-v2-representative.json'
import { normalizeSearchText, recipeMatchesQuery, type SearchMode } from '../lib/recipeHelpers'
import { normalizeExportDocument, type NormalizedExportRecipe } from '../lib/normalizeExport'
import type { ExportDocument } from '../types/recipe'
import { buildRecipeCatalog } from './recipeCatalog'
import {
  buildRecipeSearchRecord,
  recipeSearchRecordMatchesQuery,
  type RecipeSearchRecord,
} from './recipeSearchRecord'

interface SearchCase {
  query: string
  mode: SearchMode
  expected: boolean
}

function createDocument() {
  return normalizeExportDocument(structuredClone(representativeExport) as unknown as ExportDocument)
}

function expectEquivalentMatch(
  recipe: NormalizedExportRecipe,
  record: RecipeSearchRecord,
  searchCase: SearchCase,
): void {
  const normalizedQuery = normalizeSearchText(searchCase.query)

  expect(recipeMatchesQuery(recipe, normalizedQuery, searchCase.mode)).toBe(searchCase.expected)

  expect(recipeSearchRecordMatchesQuery(record, normalizedQuery, searchCase.mode)).toBe(
    searchCase.expected,
  )
}

describe('recipe search records', () => {
  it('stores normalized search data in the catalog', () => {
    const document = createDocument()
    const recipe = document.recipes[0]
    const catalog = buildRecipeCatalog(document)

    const record = catalog.searchRecordsByRecipeId.get(recipe.id)

    if (!record) {
      throw new Error('Expected recipe search record')
    }

    expect(catalog.searchRecordsByRecipeId.size).toBe(1)

    expect(record.recipeIdText).toBe('gregtech:mixer:test_recipe')

    expect(record.machineIdText).toBe('gregtech:mixer')

    expect(record.machineNameText).toBe('mixer')

    expect(record.machineCategoryText).toBe('gregtech')

    expect(record.inputs[0]).toEqual({
      kindText: 'item',
      idText: 'minecraft:clay_ball',
      displayNameText: 'clay',
      identityText: 'minecraft:clay_ball:0',
      kindIdentityText: 'item:minecraft:clay_ball:0',
    })

    expect(record.outputs[0]).toEqual({
      kindText: 'fluid',
      idText: 'water',
      displayNameText: 'water',
      identityText: 'water',
      kindIdentityText: 'fluid:water',
    })
  })

  it('preserves fuzzy search semantics', () => {
    const document = createDocument()
    const recipe = document.recipes[0]
    const record = buildRecipeSearchRecord(recipe)

    const searchCases: SearchCase[] = [
      {
        query: 'clay',
        mode: 'inputs',
        expected: true,
      },
      {
        query: 'plate mold',
        mode: 'inputs',
        expected: false,
      },
      {
        query: 'plate mold',
        mode: 'all',
        expected: true,
      },
      {
        query: 'water',
        mode: 'outputs',
        expected: true,
      },
      {
        query: 'mixer',
        mode: 'machines',
        expected: true,
      },
      {
        query: 'gregtech',
        mode: 'machines',
        expected: true,
      },
      {
        query: 'shape_mold_plate',
        mode: 'ids',
        expected: true,
      },
      {
        query: 'plate mold',
        mode: 'ids',
        expected: false,
      },
      {
        query: 'test:missing',
        mode: 'all',
        expected: false,
      },
    ]

    for (const searchCase of searchCases) {
      expectEquivalentMatch(recipe, record, searchCase)
    }
  })

  it('preserves exact search semantics', () => {
    const document = createDocument()
    const recipe = document.recipes[0]
    const record = buildRecipeSearchRecord(recipe)

    const searchCases: SearchCase[] = [
      {
        query: '+clay',
        mode: 'inputs',
        expected: true,
      },
      {
        query: '"Clay"',
        mode: 'inputs',
        expected: true,
      },
      {
        query: '+minecraft:clay_ball:0',
        mode: 'inputs',
        expected: true,
      },
      {
        query: '+item:minecraft:clay_ball:0',
        mode: 'inputs',
        expected: true,
      },
      {
        query: '+water',
        mode: 'outputs',
        expected: true,
      },
      {
        query: '+fluid:water',
        mode: 'outputs',
        expected: true,
      },
      {
        query: '+plate mold',
        mode: 'all',
        expected: true,
      },
      {
        query: '+plate mold',
        mode: 'ids',
        expected: false,
      },
      {
        query: '+gregtech:shape_mold_plate:0',
        mode: 'ids',
        expected: true,
      },
      {
        query: '+item:gregtech:shape_mold_plate:0',
        mode: 'ids',
        expected: true,
      },
      {
        query: '+gregtech:mixer:test_recipe',
        mode: 'all',
        expected: true,
      },
    ]

    for (const searchCase of searchCases) {
      expectEquivalentMatch(recipe, record, searchCase)
    }
  })

  it('preserves empty-query behavior', () => {
    const document = createDocument()
    const recipe = document.recipes[0]
    const record = buildRecipeSearchRecord(recipe)

    for (const query of ['', '   ', '""']) {
      const normalizedQuery = normalizeSearchText(query)

      expect(recipeMatchesQuery(recipe, normalizedQuery, 'all')).toBe(false)

      expect(recipeSearchRecordMatchesQuery(record, normalizedQuery, 'all')).toBe(false)
    }
  })
})
