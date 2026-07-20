import { describe, expect, it } from 'vitest'
import representativeExport from '../test/fixtures/schema-v2-representative.json'
import type { ExportDocument } from '../types/recipe'
import { normalizeExportDocument } from '../lib/normalizeExport'
import { buildRecipeCatalog } from './recipeCatalog'
import { getStackKey } from './stackKey'

function createDocument() {
    return normalizeExportDocument(
        structuredClone(
            representativeExport,
        ) as unknown as ExportDocument,
    )
}

describe('getStackKey', () => {
    it('distinguishes item stacks by metadata', () => {
        const document = createDocument()
        const item = document.recipes[0].inputs[0]

        const firstKey = getStackKey({
            ...item,
            meta: 0,
        })

        const secondKey = getStackKey({
            ...item,
            meta: 1,
        })

        expect(firstKey).toBe(
            'item:minecraft:clay_ball:0',
        )

        expect(secondKey).toBe(
            'item:minecraft:clay_ball:1',
        )

        expect(firstKey).not.toBe(secondKey)
    })

    it('ignores metadata for fluid identity', () => {
        const document = createDocument()
        const fluid = document.recipes[0].outputs[0]

        expect(fluid.kind).toBe('fluid')

        const firstKey = getStackKey({
            ...fluid,
            meta: 0,
        })

        const secondKey = getStackKey({
            ...fluid,
            meta: 32_767,
        })

        expect(firstKey).toBe('fluid:water')
        expect(secondKey).toBe('fluid:water')
        expect(firstKey).toBe(secondKey)
    })
})

describe('buildRecipeCatalog', () => {
    it('indexes recipes by recipe ID', () => {
        const document = createDocument()
        const recipe = document.recipes[0]

        const catalog = buildRecipeCatalog(document)

        expect(catalog.allRecipeIds).toEqual([
            recipe.id,
        ])

        expect(catalog.recipesById.get(recipe.id)).toBe(recipe)

        expect(catalog.recipesById.size).toBe(1)
    })

    it('indexes recipes by machine ID', () => {
        const document = createDocument()
        const recipe = document.recipes[0]

        const catalog = buildRecipeCatalog(document)

        expect(
            catalog.recipeIdsByMachine.get(
                recipe.machine.id,
            ),
        ).toEqual([recipe.id])
    })

    it('indexes inputs, outputs, and tools without duplicating recipe IDs', () => {
        const document = createDocument()
        const recipe = document.recipes[0]

        expect(recipe.inputs.length).toBeGreaterThan(0)
        expect(recipe.outputs.length).toBeGreaterThan(0)
        expect(recipe.tools.length).toBeGreaterThan(0)

        const input = recipe.inputs[0]
        const output = recipe.outputs[0]
        const tool = recipe.tools[0]

        /*
         * Repeat the same input identity in multiple slots.
         * The consumer index should still contain this recipe
         * only once.
         */
        recipe.inputs = [
            input,
            {
                ...input,
                amount: input.amount + 1,
            },
        ]

        const catalog = buildRecipeCatalog(document)

        const consumerIds = catalog.consumerRecipeIdsByStackKey.get(
            getStackKey(input),
        )

        const producerIds = catalog.producerRecipeIdsByStackKey.get(
            getStackKey(output),
        )

        const toolRecipeIds = catalog.toolRecipeIdsByStackKey.get(
            getStackKey(tool),
        )

        expect(consumerIds).toEqual([
            recipe.id,
        ])

        expect(producerIds).toEqual([
            recipe.id,
        ])

        expect(toolRecipeIds).toEqual([
            recipe.id,
        ])
    })

    it('rejects duplicate recipe IDs', () => {
        const document = createDocument()
        const recipe = document.recipes[0]

        document.recipes.push({
            ...recipe,
            machine: {
                ...recipe.machine,
            },
            inputs: recipe.inputs.map((stack) => ({
                ...stack,
            })),
            tools: recipe.tools.map((stack) => ({
                ...stack,
            })),
            outputs: recipe.outputs.map((stack) => ({
                ...stack,
            })),
            metadata: {
                ...recipe.metadata,
            },
        })

        expect(() => {
            buildRecipeCatalog(document)
        }).toThrow(
            `Duplicate recipe ID in catalog: ${recipe.id}`,
        )
    })
})