import { describe, expect, it } from 'vitest'
import representativeExport from '../test/fixtures/schema-v2-representative.json'
import type { ExportDocument } from '../types/recipe'
import { normalizeExportDocument } from '../lib/normalizeExport'
import { buildRecipeCatalog } from './recipeCatalog'
import {
    getConsumerRecipesForStack,
    getMachineRecipeCounts,
    getProducerRecipesForStack,
    getRecipesForMachine,
} from './recipeCatalogQueries'

function createDocument() {
    return normalizeExportDocument(
        structuredClone(
            representativeExport,
        ) as unknown as ExportDocument,
    )
}

describe('recipe catalog stack queries', () => {
    it('resolves recipes that produce a stack', () => {
        const document = createDocument()
        const recipe = document.recipes[0]
        const output = recipe.outputs[0]
        const catalog = buildRecipeCatalog(document)

        const producers =
            getProducerRecipesForStack(
                catalog,
                output,
            )

        expect(producers).toEqual([recipe])
        expect(producers[0]).toBe(recipe)
    })

    it('resolves recipes that consume a stack', () => {
        const document = createDocument()
        const recipe = document.recipes[0]
        const input = recipe.inputs[0]
        const catalog = buildRecipeCatalog(document)

        const consumers =
            getConsumerRecipesForStack(
                catalog,
                input,
            )

        expect(consumers).toEqual([recipe])
        expect(consumers[0]).toBe(recipe)
    })

    it('does not treat tools as consumed inputs', () => {
        const document = createDocument()
        const recipe = document.recipes[0]
        const tool = recipe.tools[0]
        const catalog = buildRecipeCatalog(document)

        expect(recipe.tools.length).toBeGreaterThan(0)

        expect(
            getConsumerRecipesForStack(
                catalog,
                tool,
            ),
        ).toEqual([])
    })

    it('returns an empty result for an unknown stack', () => {
        const document = createDocument()
        const recipe = document.recipes[0]
        const catalog = buildRecipeCatalog(document)

        const unknownStack = {
            ...recipe.inputs[0],
            id: 'test:missing-stack',
            meta: 32_767,
        }

        expect(
            getProducerRecipesForStack(
                catalog,
                unknownStack,
            ),
        ).toEqual([])

        expect(
            getConsumerRecipesForStack(
                catalog,
                unknownStack,
            ),
        ).toEqual([])
    })
})

describe('recipe catalog machine queries', () => {
    it('resolves recipes belonging to a machine', () => {
        const document = createDocument()
        const recipe = document.recipes[0]

        const secondRecipe = {
            ...recipe,
            id: `${recipe.id}:second`,
        }

        document.recipes.push(secondRecipe)

        const catalog = buildRecipeCatalog(document)

        const machineRecipes = getRecipesForMachine(
            catalog,
            recipe.machine.id,
        )

        expect(machineRecipes).toEqual([
            recipe,
            secondRecipe,
        ])

        expect(machineRecipes[0]).toBe(recipe)
        expect(machineRecipes[1]).toBe(secondRecipe)
    })

    it('returns an empty result for an unknown machine', () => {
        const document = createDocument()
        const catalog = buildRecipeCatalog(document)

        expect(
            getRecipesForMachine(
                catalog,
                'test:missing-machine',
            ),
        ).toEqual([])
    })

    it('derives machine counts in descending order', () => {
        const document = createDocument()
        const recipe = document.recipes[0]

        const sameMachineRecipe = {
            ...recipe,
            id: `${recipe.id}:same-machine`,
        }

        const otherMachineRecipe = {
            ...recipe,
            id: `${recipe.id}:other-machine`,
            machine: {
                ...recipe.machine,
                id: 'test:other-machine',
                name: 'Other Machine',
            },
        }

        document.recipes.push(
            sameMachineRecipe,
            otherMachineRecipe,
        )

        const catalog = buildRecipeCatalog(document)

        expect(getMachineRecipeCounts(catalog)).toEqual([
            {
                machineId: recipe.machine.id,
                count: 2,
            },
            {
                machineId: 'test:other-machine',
                count: 1,
            },
        ])
    })
})
