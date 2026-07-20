import { describe, expect, it } from 'vitest'
import type { NormalizedExportRecipe } from '../../lib/normalizeExport'
import {
    createPlannerDraft,
    setPlannerDraftConstraintSolveMode,
    setPlannerDraftFixedMachineCount,
    setPlannerDraftStackConstraintRate,
} from '../model/plannerDraft'
import { buildVisualGraphFromPlanSummary } from './planGraph'
import { computePlannerDraftSummary, getStackKey } from './planSummary'

const TEST_RECIPE: NormalizedExportRecipe = {
    id: 'test:mixer-recipe',
    machine: {
        id: 'gregtech:mixer',
        name: 'Mixer',
        category: 'GregTech',
    },
    durationTicks: 40,
    durationSeconds: 2,
    eut: 30,
    inputs: [
        {
            kind: 'item',
            id: 'test:input-a',
            meta: 0,
            displayName: 'Input A',
            amount: 4,
            unit: 'items',
        },
        {
            kind: 'fluid',
            id: 'test:input-b',
            meta: 0,
            displayName: 'Input B',
            amount: 2,
            unit: 'L',
        },
    ],
    tools: [],
    outputs: [
        {
            kind: 'item',
            id: 'test:target',
            meta: 0,
            displayName: 'Target Product',
            amount: 3,
            unit: 'items',
        },
        {
            kind: 'item',
            id: 'test:byproduct',
            meta: 0,
            displayName: 'Byproduct',
            amount: 1,
            unit: 'items',
        },
    ],
    metadata: {},
}

const INPUT_A_KEY = getStackKey(TEST_RECIPE.inputs[0])
const INPUT_B_KEY = getStackKey(TEST_RECIPE.inputs[1])
const TARGET_KEY = getStackKey(TEST_RECIPE.outputs[0])
const BYPRODUCT_KEY = getStackKey(TEST_RECIPE.outputs[1])

describe('computePlannerDraftSummary', () => {
    it('defaults to one machine running at base recipe timing', () => {
        const draft = createPlannerDraft(TEST_RECIPE)

        const summary = computePlannerDraftSummary(TEST_RECIPE, draft)

        expect(summary.machineCountMode).toBe('auto')
        expect(summary.solveMode).toBe('from-outputs')
        expect(summary.operationsPerSecond).toBeCloseTo(0.5)
        expect(summary.exactMachineCount).toBeCloseTo(1)
        expect(summary.roundedMachineCount).toBe(1)
        expect(summary.buildMachineCount).toBe(1)
        expect(summary.installedCyclesPerSecond).toBeCloseTo(0.5)
        expect(summary.targetRatePerSecond).toBeCloseTo(1.5)
    })

    it('solves automatic machine count from a wanted output rate', () => {
        let draft = createPlannerDraft(TEST_RECIPE)

        draft = setPlannerDraftStackConstraintRate(
            draft,
            TARGET_KEY,
            'output-wanted',
            6,
        )

        const summary = computePlannerDraftSummary(TEST_RECIPE, draft)
        const targetRate = summary.targetOutputRates[0]

        expect(summary.operationsPerSecond).toBeCloseTo(2)
        expect(summary.exactMachineCount).toBeCloseTo(4)
        expect(summary.roundedMachineCount).toBe(4)
        expect(summary.buildMachineCount).toBe(4)

        expect(targetRate.constraintRatePerSecond).toBeCloseTo(6)
        expect(targetRate.producedRatePerSecond).toBeCloseTo(6)
        expect(targetRate.status).toBe('satisfied')
    })

    it('uses the lowest provided-input capacity as the limiting rate', () => {
        let draft = createPlannerDraft(TEST_RECIPE)

        draft = setPlannerDraftConstraintSolveMode(
            draft,
            'from-inputs',
        )

        draft = setPlannerDraftStackConstraintRate(
            draft,
            INPUT_A_KEY,
            'input-provided',
            8,
        )

        draft = setPlannerDraftStackConstraintRate(
            draft,
            INPUT_B_KEY,
            'input-provided',
            3,
        )

        const summary = computePlannerDraftSummary(TEST_RECIPE, draft)
        const inputA = summary.inputRates[0]
        const inputB = summary.inputRates[1]

        expect(summary.operationsPerSecond).toBeCloseTo(1.5)
        expect(summary.exactMachineCount).toBeCloseTo(3)
        expect(summary.limitingStackKey).toBe(INPUT_B_KEY)

        expect(inputB.ratePerSecond).toBeCloseTo(3)
        expect(inputB.status).toBe('limiting')

        expect(inputA.ratePerSecond).toBeCloseTo(6)
        expect(inputA.excessRatePerSecond).toBeCloseTo(2)
        expect(inputA.status).toBe('excess')
    })

    it('caps output production at fixed installed capacity', () => {
        let draft = createPlannerDraft(TEST_RECIPE)

        draft = setPlannerDraftFixedMachineCount(draft, 2)

        draft = setPlannerDraftStackConstraintRate(
            draft,
            TARGET_KEY,
            'output-wanted',
            6,
        )

        const summary = computePlannerDraftSummary(TEST_RECIPE, draft)
        const targetRate = summary.targetOutputRates[0]

        expect(summary.machineCountMode).toBe('fixed')
        expect(summary.fixedMachineCount).toBe(2)
        expect(summary.operationsPerSecond).toBeCloseTo(1)
        expect(summary.installedCyclesPerSecond).toBeCloseTo(1)

        expect(targetRate.producedRatePerSecond).toBeCloseTo(3)
        expect(targetRate.constraintRatePerSecond).toBeCloseTo(6)
        expect(targetRate.shortageRatePerSecond).toBeCloseTo(3)
        expect(targetRate.status).toBe('short')
    })

    it('does not label abundant inputs as limiting when machines are the bottleneck', () => {
        let draft = createPlannerDraft(TEST_RECIPE)

        draft = setPlannerDraftFixedMachineCount(draft, 1)

        draft = setPlannerDraftConstraintSolveMode(
            draft,
            'from-inputs',
        )

        draft = setPlannerDraftStackConstraintRate(
            draft,
            INPUT_A_KEY,
            'input-provided',
            100,
        )

        draft = setPlannerDraftStackConstraintRate(
            draft,
            INPUT_B_KEY,
            'input-provided',
            100,
        )

        const summary = computePlannerDraftSummary(TEST_RECIPE, draft)

        expect(summary.operationsPerSecond).toBeCloseTo(0.5)
        expect(summary.limitingStackKey).toBeUndefined()
        expect(summary.inputRates[0].status).toBe('excess')
        expect(summary.inputRates[1].status).toBe('excess')
    })

    it('normalizes fractional fixed machine counts to whole machines', () => {
        let draft = createPlannerDraft(TEST_RECIPE)

        draft = setPlannerDraftFixedMachineCount(draft, 2.9)

        const rootNode = draft.plan.nodesById[draft.plan.rootNodeId]
        const summary = computePlannerDraftSummary(TEST_RECIPE, draft)

        expect(rootNode.quickPlanSettings?.fixedMachineCount).toBe(2)
        expect(summary.fixedMachineCount).toBe(2)
        expect(summary.exactMachineCount).toBe(2)
        expect(summary.buildMachineCount).toBe(2)
    })

    it('marks unconstrained target and byproduct outputs distinctly', () => {
        const draft = createPlannerDraft(TEST_RECIPE)

        const summary = computePlannerDraftSummary(TEST_RECIPE, draft)

        expect(summary.targetOutputRates).toHaveLength(1)
        expect(summary.byproductRates).toHaveLength(1)
        expect(summary.targetOutputRates[0].stackKey).toBe(TARGET_KEY)
        expect(summary.byproductRates[0].stackKey).toBe(BYPRODUCT_KEY)
        expect(summary.targetOutputRates[0].status).toBe('target')
        expect(summary.byproductRates[0].status).toBe('byproduct')
    })
})

describe('buildVisualGraphFromPlanSummary', () => {
    it('maps default input and output states onto graph edge states', () => {
        const draft = createPlannerDraft(TEST_RECIPE)
        const summary = computePlannerDraftSummary(TEST_RECIPE, draft)
        const graph = buildVisualGraphFromPlanSummary(summary)

        expect(findEdgeStatus(graph, INPUT_A_KEY)).toBe('short')
        expect(findEdgeStatus(graph, TARGET_KEY)).toBe('satisfied')
        expect(findEdgeStatus(graph, BYPRODUCT_KEY)).toBe('excess')
    })

    it('maps limiting and excess inputs onto their graph edge states', () => {
        let draft = createPlannerDraft(TEST_RECIPE)

        draft = setPlannerDraftConstraintSolveMode(
            draft,
            'from-inputs',
        )

        draft = setPlannerDraftStackConstraintRate(
            draft,
            INPUT_A_KEY,
            'input-provided',
            8,
        )

        draft = setPlannerDraftStackConstraintRate(
            draft,
            INPUT_B_KEY,
            'input-provided',
            3,
        )

        const summary = computePlannerDraftSummary(TEST_RECIPE, draft)
        const graph = buildVisualGraphFromPlanSummary(summary)

        expect(findEdgeStatus(graph, INPUT_A_KEY)).toBe('excess')
        expect(findEdgeStatus(graph, INPUT_B_KEY)).toBe('satisfied')
    })

    it('maps fixed-capacity output shortages onto short graph edges', () => {
        let draft = createPlannerDraft(TEST_RECIPE)

        draft = setPlannerDraftFixedMachineCount(draft, 2)

        draft = setPlannerDraftStackConstraintRate(
            draft,
            TARGET_KEY,
            'output-wanted',
            6,
        )

        const summary = computePlannerDraftSummary(TEST_RECIPE, draft)
        const graph = buildVisualGraphFromPlanSummary(summary)

        expect(findEdgeStatus(graph, TARGET_KEY)).toBe('short')
    })
})

function findEdgeStatus(
    graph: ReturnType<typeof buildVisualGraphFromPlanSummary>,
    stackKey: string,
) {
    return graph.edges.find((edge) => edge.stackKey === stackKey)?.status
}
