import type { NormalizedExportRecipe } from '../../lib/normalizeExport'
import type { ExportStack } from '../../types/recipe'
import type { PlannerDraft } from '../model/plannerDraft'
import type { PlannerNode, PlannerPlan, StackKey } from '../model/plannerPlan'

export interface PlannerRecipeCatalog {
    recipesById: Record<string, NormalizedExportRecipe | undefined>
}

export interface PlannerPlanSummary {
    planId: string
    planName: string
    rootNodeId: string
    rootRecipeId?: string
    targetOutput?: ExportStack
    targetOutputIndex: number
    targetRatePerSecond?: number
    baseTargetRatePerSecond?: number
    operationsPerSecond?: number
    exactMachineCount?: number
    roundedMachineCount?: number
    inputRates: PlannerStackRate[]
    targetOutputRates: PlannerStackRate[]
    byproductRates: PlannerStackRate[]
    unresolvedInputRates: PlannerStackRate[]
    voidedOutputRates: PlannerStackRate[]
    manualImportRates: PlannerStackRate[]
    machineSummaries: PlannerMachineSummary[]
    powerEstimate?: PlannerPowerEstimate
}

export interface PlannerStackRate {
    nodeId: string
    recipeId: string
    stackKey: StackKey
    stack: ExportStack
    ratePerSecond: number
    perMachineRatePerSecond?: number
}

export interface PlannerMachineSummary {
    nodeId: string
    recipeId: string
    machineId: string
    machineName: string
    exactMachineCount?: number
    roundedMachineCount?: number
    recipeEuPerTick: number
    exactEuPerTick?: number
    roundedEuPerTick?: number
}

export interface PlannerPowerEstimate {
    recipeEuPerTick: number
    exactMachineCount: number
    roundedMachineCount: number
    exactEuPerTick: number
    roundedEuPerTick: number
}

export function computePlannerDraftSummary(recipe: NormalizedExportRecipe, draft: PlannerDraft): PlannerPlanSummary {
    return computePlannerPlanSummary(draft.plan, {
        recipesById: {
            [recipe.id]: recipe,
        }
    })
}

export function computePlannerPlanSummary(plan: PlannerPlan, recipeCatalog: PlannerRecipeCatalog): PlannerPlanSummary {
    const rootNode = plan.nodesById[plan.rootNodeId]
    const rootRecipe = getNodeRecipe(rootNode, recipeCatalog)

    if (!rootNode || !rootRecipe) {
        return createEmptyPlanSummary(plan)
    }

    return computeRecipeNodeSummary(plan, rootNode, rootRecipe)
}

export function getStackKey(stack: ExportStack): StackKey {
    if (stack.kind === 'fluid') {
        return `${stack.kind}:${stack.id}`
    }

    return `${stack.kind}:${stack.id}:${stack.meta}`
}

function computeRecipeNodeSummary(plan: PlannerPlan, rootNode: PlannerNode, recipe: NormalizedExportRecipe): PlannerPlanSummary {
    const targetOutputIndex = getTargetOutputIndex(rootNode, recipe)
    const targetOutput = recipe.outputs[targetOutputIndex] ?? recipe.outputs[0]
    const targetRatePerSecond = rootNode.targetRatePerSecond
    const baseTargetRatePerSecond = getBaseStackRatePerSecond(recipe, targetOutput)
    const operationsPerSecond = getOperationsPerSecond(targetOutput, targetRatePerSecond)
    const exactMachineCount = getExactMachineCount(targetRatePerSecond, baseTargetRatePerSecond)
    const roundedMachineCount = exactMachineCount !== undefined ? Math.ceil(exactMachineCount) : undefined

    const inputRates = operationsPerSecond !== undefined
        ? recipe.inputs.map((stack) =>
            createStackRate(rootNode, recipe, stack, operationsPerSecond),
        )
        : []

    const outputRates = operationsPerSecond !== undefined
        ? recipe.outputs.map((stack) =>
            createStackRate(rootNode, recipe, stack, operationsPerSecond),
        )
        : []

    const targetOutputRates = targetOutput
        ? outputRates.filter(({ stack }) => stack === targetOutput)
        : []

    const byproductRates = targetOutput
        ? outputRates.filter(({ stack }) => stack !== targetOutput)
        : outputRates

    const powerEstimate = getPowerEstimate(recipe, exactMachineCount, roundedMachineCount)

    return {
        planId: plan.id,
        planName: plan.name,
        rootNodeId: rootNode.id,
        rootRecipeId: recipe.id,
        targetOutput,
        targetOutputIndex,
        targetRatePerSecond,
        baseTargetRatePerSecond,
        operationsPerSecond,
        exactMachineCount,
        roundedMachineCount,
        inputRates,
        targetOutputRates,
        byproductRates,
        unresolvedInputRates: inputRates,
        voidedOutputRates: [],
        manualImportRates: [],
        machineSummaries: [
            {
                nodeId: rootNode.id,
                recipeId: recipe.id,
                machineId: recipe.machine.id,
                machineName: recipe.machine.name,
                exactMachineCount,
                roundedMachineCount,
                recipeEuPerTick: recipe.eut,
                exactEuPerTick: powerEstimate?.exactEuPerTick,
                roundedEuPerTick: powerEstimate?.roundedEuPerTick,
            },
        ],
        powerEstimate,
    }
}

function createEmptyPlanSummary(plan: PlannerPlan): PlannerPlanSummary {
    return {
        planId: plan.id,
        planName: plan.name,
        rootNodeId: plan.rootNodeId,
        targetOutputIndex: 0,
        inputRates: [],
        targetOutputRates: [],
        byproductRates: [],
        unresolvedInputRates: [],
        voidedOutputRates: [],
        manualImportRates: [],
        machineSummaries: [],
    }
}

function getNodeRecipe(node: PlannerNode | undefined, recipeCatalog: PlannerRecipeCatalog): NormalizedExportRecipe | undefined {
    if (!node || node.kind !== 'recipe' || !node.recipeId) {
        return undefined
    }

    return recipeCatalog.recipesById[node.recipeId]
}

function getTargetOutputIndex(node: PlannerNode, recipe: NormalizedExportRecipe): number {
    const targetOutputIndex = node.targetOutputIndex ?? 0

    if (targetOutputIndex < 0 || targetOutputIndex >= recipe.outputs.length) {
        return 0
    }

    return targetOutputIndex
}

function getBaseStackRatePerSecond(recipe: NormalizedExportRecipe, stack: ExportStack | undefined): number | undefined {
    if (!stack || recipe.durationSeconds <= 0) {
        return undefined
    }

    return stack.amount / recipe.durationSeconds
}

function getOperationsPerSecond(targetOutput: ExportStack | undefined, targetRatePerSecond: number | undefined): number | undefined {
    if (!targetOutput || targetOutput.amount <= 0 || targetRatePerSecond === undefined || targetRatePerSecond <= 0) {
        return undefined
    }

    return targetRatePerSecond / targetOutput.amount
}

function getExactMachineCount(targetRatePerSecond: number | undefined, baseTargetRatePerSecond: number | undefined): number | undefined {
    if (targetRatePerSecond === undefined || targetRatePerSecond <= 0 || baseTargetRatePerSecond === undefined || baseTargetRatePerSecond <= 0) {
        return undefined
    }

    return targetRatePerSecond / baseTargetRatePerSecond
}

function createStackRate(node: PlannerNode, recipe: NormalizedExportRecipe, stack: ExportStack, operationsPerSecond: number): PlannerStackRate {
    return {
        nodeId: node.id,
        recipeId: recipe.id,
        stackKey: getStackKey(stack),
        stack,
        ratePerSecond: stack.amount * operationsPerSecond,
        perMachineRatePerSecond: getBaseStackRatePerSecond(recipe, stack),
    }
}

function getPowerEstimate(recipe: NormalizedExportRecipe, exactMachineCount: number | undefined, roundedMachineCount: number | undefined): PlannerPowerEstimate | undefined {
    if (exactMachineCount === undefined || roundedMachineCount === undefined) {
        return undefined
    }

    return {
        recipeEuPerTick: recipe.eut,
        exactMachineCount,
        roundedMachineCount,
        exactEuPerTick: recipe.eut * exactMachineCount,
        roundedEuPerTick: recipe.eut * roundedMachineCount,
    }
}