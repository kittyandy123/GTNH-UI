import type { NormalizedExportRecipe } from '../../lib/normalizeExport'
import type { ExportStack } from '../../types/recipe'
import type { PlannerDraft } from '../model/plannerDraft'
import {
    DEFAULT_QUICK_PLAN_SETTINGS,
    type ConstraintSolveMode,
    type MachineCountMode,
    type PlannerNode,
    type PlannerNodeQuickPlanSettings,
    type PlannerPlan,
    type PlannerStackConstraintRole,
    type StackKey,
} from '../model/plannerPlan'

export interface PlannerRecipeCatalog {
    recipesById: Record<string, NormalizedExportRecipe | undefined>
}

export interface PlannerPlanSummary {
    planId: string
    rootNodeId: string
    rootRecipe?: NormalizedExportRecipe
    usesEuPower: boolean
    targetOutput?: ExportStack
    targetOutputIndex: number
    targetRatePerSecond?: number
    baseTargetRatePerSecond?: number
    operationsPerSecond?: number

    machineCountMode: MachineCountMode
    solveMode: ConstraintSolveMode
    fixedMachineCount?: number
    exactMachineCount?: number
    roundedMachineCount?: number
    buildMachineCount?: number
    installedCyclesPerSecond?: number
    limitingStackKey?: StackKey

    inputRates: PlannerStackRate[]
    targetOutputRates: PlannerStackRate[]
    byproductRates: PlannerStackRate[]
    unresolvedInputRates: PlannerStackRate[]
    voidedOutputRates: PlannerStackRate[]
    manualImportRates: PlannerStackRate[]
    resourceRates: PlannerStackRate[]

    machineSummaries: PlannerMachineSummary[]
    powerEstimate?: PlannerPowerEstimate
    assumptionWarnings: string[]
}

export type PlannerStackRateRole = 'input' | 'output'

export type PlannerStackRateStatus =
    | 'unresolved'
    | 'limiting'
    | 'short'
    | 'excess'
    | 'satisfied'
    | 'target'
    | 'byproduct'

export interface PlannerStackRate {
    nodeId: string
    recipeId: string
    stackKey: StackKey
    stack: ExportStack
    stackIndex: number
    role: PlannerStackRateRole
    constraintRole?: PlannerStackConstraintRole
    constraintRatePerSecond?: number
    ratePerSecond: number
    requiredRatePerSecond?: number
    producedRatePerSecond?: number
    excessRatePerSecond?: number
    shortageRatePerSecond?: number
    status: PlannerStackRateStatus
    perMachineRatePerSecond?: number
}

export interface PlannerMachineSummary {
    nodeId: string
    recipeId: string
    machineId: string
    machineName: string
    machineCountMode: MachineCountMode
    solveMode: ConstraintSolveMode
    fixedMachineCount?: number
    exactMachineCount?: number
    roundedMachineCount?: number
    buildMachineCount?: number
    installedCyclesPerSecond?: number
    recipeEuPerTick: number
    exactEuPerTick?: number
    roundedEuPerTick?: number
}

export interface PlannerPowerEstimate {
    recipeEuPerTick: number
    exactEuPerTick: number
    roundedEuPerTick: number
}

interface QuickPlanSolveResult {
    machineCountMode: MachineCountMode
    solveMode: ConstraintSolveMode
    fixedMachineCount?: number
    cyclesPerSecond: number
    exactMachineCount: number
    roundedMachineCount: number
    buildMachineCount: number
    installedCyclesPerSecond: number
    limitingStackKey?: StackKey
}

interface ConstraintCycleResult {
    cyclesPerSecond: number
    limitingStackKey?: StackKey
}

export function computePlannerDraftSummary(recipe: NormalizedExportRecipe, draft: PlannerDraft): PlannerPlanSummary {
    return computePlannerPlanSummary(draft.plan, {
        recipesById: {
            [recipe.id]: recipe,
        },
    })
}
export function computePlannerPlanSummary(plan: PlannerPlan, catalog: PlannerRecipeCatalog): PlannerPlanSummary {
    const rootNode = plan.nodesById[plan.rootNodeId]

    if (!rootNode || rootNode.kind !== 'recipe' || !rootNode.recipeId) {
        return createEmptyPlanSummary(plan)
    }

    const recipe = catalog.recipesById[rootNode.recipeId]

    if (!recipe) {
        return createEmptyPlanSummary(plan)
    }

    return computeRecipeNodeSummary(plan, rootNode, recipe)
}

export function getStackKey(stack: ExportStack): StackKey {
    if (stack.kind === 'fluid') {
        return `${stack.kind}:${stack.id}`
    }

    return `${stack.kind}:${stack.id}:${stack.meta ?? 0}`
}

function computeRecipeNodeSummary(plan: PlannerPlan, rootNode: PlannerNode, recipe: NormalizedExportRecipe): PlannerPlanSummary {
    const quickPlanSettings = getQuickPlanSettings(rootNode)
    const targetOutputIndex = getTargetOutputIndex(rootNode, recipe)
    const targetOutput = recipe.outputs[targetOutputIndex] ?? recipe.outputs[0]
    const constraintsByRoleAndStack = getConstraintsByRoleAndStack(rootNode)
    const baseTargetRatePerSecond = getBaseStackRatePerSecond(recipe, targetOutput)
    const solveResult = solveQuickPlan(recipe, quickPlanSettings, constraintsByRoleAndStack)
    const operationsPerSecond = solveResult.cyclesPerSecond
    const targetRatePerSecond = targetOutput
        ? targetOutput.amount * operationsPerSecond
        : undefined
    const usesEuPower = isEuPoweredRecipe(recipe)

    const inputRates = recipe.inputs.map((stack, index) =>
        createStackRate({
            node: rootNode,
            recipe,
            stack,
            stackIndex: index,
            role: 'input',
            cyclesPerSecond: operationsPerSecond,
            constraintRatePerSecond: getConstraintRate(
                constraintsByRoleAndStack,
                'input-provided',
                stack,
            ),
            constraintRole: 'input-provided',
            limitingStackKey: solveResult.limitingStackKey,
        }),
    )

    const outputRates = recipe.outputs.map((stack, index) =>
        createStackRate({
            node: rootNode,
            recipe,
            stack,
            stackIndex: index,
            role: 'output',
            cyclesPerSecond: operationsPerSecond,
            constraintRatePerSecond: getConstraintRate(
                constraintsByRoleAndStack,
                'output-wanted',
                stack,
            ),
            constraintRole: 'output-wanted',
            isTargetOutput: index === targetOutputIndex,
        }),
    )

    const targetOutputRates = outputRates.filter(
        (rate) => rate.stackIndex === targetOutputIndex,
    )
    const byproductRates = outputRates.filter(
        (rate) => rate.stackIndex !== targetOutputIndex,
    )

    const powerEstimate = usesEuPower
        ? getPowerEstimate(recipe, solveResult.exactMachineCount, solveResult.roundedMachineCount)
        : undefined

    return {
        planId: plan.id,
        rootNodeId: rootNode.id,
        rootRecipe: recipe,
        usesEuPower,
        targetOutput,
        targetOutputIndex,
        targetRatePerSecond,
        baseTargetRatePerSecond,
        operationsPerSecond,

        machineCountMode: solveResult.machineCountMode,
        solveMode: solveResult.solveMode,
        fixedMachineCount: solveResult.fixedMachineCount,
        exactMachineCount: solveResult.exactMachineCount,
        roundedMachineCount: solveResult.roundedMachineCount,
        buildMachineCount: solveResult.buildMachineCount,
        installedCyclesPerSecond: solveResult.installedCyclesPerSecond,
        limitingStackKey: solveResult.limitingStackKey,

        inputRates,
        targetOutputRates,
        byproductRates,
        unresolvedInputRates: inputRates.filter(
            (rate) => rate.status === 'unresolved' || rate.status === 'short',
        ),
        voidedOutputRates: [],
        manualImportRates: [],
        resourceRates: [...inputRates, ...outputRates],

        machineSummaries: [
            {
                nodeId: rootNode.id,
                recipeId: recipe.id,
                machineId: recipe.machine.id,
                machineName: recipe.machine.name,
                machineCountMode: solveResult.machineCountMode,
                solveMode: solveResult.solveMode,
                fixedMachineCount: solveResult.fixedMachineCount,
                exactMachineCount: solveResult.exactMachineCount,
                roundedMachineCount: solveResult.roundedMachineCount,
                buildMachineCount: solveResult.buildMachineCount,
                installedCyclesPerSecond: solveResult.installedCyclesPerSecond,
                recipeEuPerTick: recipe.eut,
                exactEuPerTick: powerEstimate?.exactEuPerTick,
                roundedEuPerTick: powerEstimate?.roundedEuPerTick,
            },
        ],

        powerEstimate,
        assumptionWarnings: [
            'Quick preview uses base recipe timing only. Machine tier, overclocking, multiblock hatches, coils, and parallel behavior belong in planner workspaces later.',
        ],
    }
}

function createEmptyPlanSummary(plan: PlannerPlan): PlannerPlanSummary {
    return {
        planId: plan.id,
        rootNodeId: plan.rootNodeId,
        usesEuPower: false,
        targetOutputIndex: 0,
        machineCountMode: DEFAULT_QUICK_PLAN_SETTINGS.machineCountMode,
        solveMode: DEFAULT_QUICK_PLAN_SETTINGS.solveMode,
        inputRates: [],
        targetOutputRates: [],
        byproductRates: [],
        unresolvedInputRates: [],
        voidedOutputRates: [],
        manualImportRates: [],
        resourceRates: [],
        machineSummaries: [],
        assumptionWarnings: [],
    }
}

function getTargetOutputIndex(node: PlannerNode, recipe: NormalizedExportRecipe): number {
    const targetOutputIndex = node.targetOutputIndex ?? 0

    if (!Number.isFinite(targetOutputIndex) || targetOutputIndex < 0) {
        return 0
    }

    if (targetOutputIndex >= recipe.outputs.length) {
        return 0
    }

    return targetOutputIndex
}

function getQuickPlanSettings(node: PlannerNode): PlannerNodeQuickPlanSettings {
    return {
        ...DEFAULT_QUICK_PLAN_SETTINGS,
        ...node.quickPlanSettings,
        baseTimingOnly: true,
    }
}

function solveQuickPlan(recipe: NormalizedExportRecipe, settings: PlannerNodeQuickPlanSettings, constraintsByRoleAndStack: Map<string, number>): QuickPlanSolveResult {
    const baseCyclesPerSecond = getBaseCyclesPerSecond(recipe)

    const constraintResult =
        settings.solveMode === 'from-inputs'
            ? getCyclesFromInputConstraints(recipe, constraintsByRoleAndStack)
            : getCyclesFromOutputConstraints(recipe, constraintsByRoleAndStack)

    if (settings.machineCountMode === 'fixed') {
        const fixedMachineCount = getPositiveMachineCount(settings.fixedMachineCount) ?? 1
        const installedCyclesPerSecond = fixedMachineCount * baseCyclesPerSecond
        const requestedCyclesPerSecond = constraintResult?.cyclesPerSecond ?? installedCyclesPerSecond
        const cyclesPerSecond = Math.min(requestedCyclesPerSecond, installedCyclesPerSecond)
        const inputConstraintIsLimiting =
            settings.solveMode === 'from-inputs' &&
            constraintResult !== undefined &&
            constraintResult.cyclesPerSecond <= installedCyclesPerSecond

        return {
            machineCountMode: 'fixed',
            solveMode: settings.solveMode,
            fixedMachineCount,
            cyclesPerSecond,
            exactMachineCount: fixedMachineCount,
            roundedMachineCount: fixedMachineCount,
            buildMachineCount: fixedMachineCount,
            installedCyclesPerSecond,
            limitingStackKey: inputConstraintIsLimiting
                ? constraintResult.limitingStackKey
                : undefined,
        }
    }

    const cyclesPerSecond = constraintResult?.cyclesPerSecond ?? baseCyclesPerSecond
    const exactMachineCount = cyclesPerSecond / baseCyclesPerSecond
    const roundedMachineCount = Math.ceil(exactMachineCount)

    return {
        machineCountMode: 'auto',
        solveMode: settings.solveMode,
        cyclesPerSecond,
        exactMachineCount,
        roundedMachineCount,
        buildMachineCount: roundedMachineCount,
        installedCyclesPerSecond: roundedMachineCount * baseCyclesPerSecond,
        limitingStackKey: constraintResult?.limitingStackKey,
    }
}

function getBaseCyclesPerSecond(recipe: NormalizedExportRecipe): number {
    if (recipe.durationSeconds <= 0) {
        return 1
    }

    return 1 / recipe.durationSeconds
}

function getBaseStackRatePerSecond(recipe: NormalizedExportRecipe, stack: ExportStack | undefined): number | undefined {
    if (!stack || recipe.durationSeconds <= 0) {
        return undefined
    }

    return stack.amount / recipe.durationSeconds
}

function getCyclesFromInputConstraints(recipe: NormalizedExportRecipe, constraintsByRoleAndStack: Map<string, number>): ConstraintCycleResult | undefined {
    let limitingCyclesPerSecond: number | undefined
    let limitingStackKey: StackKey | undefined

    recipe.inputs.forEach((stack) => {
        const providedRate = getConstraintRate(
            constraintsByRoleAndStack,
            'input-provided',
            stack,
        )

        if (providedRate === undefined || stack.amount <= 0) {
            return
        }

        const possibleCyclesPerSecond = providedRate / stack.amount

        if (limitingCyclesPerSecond === undefined || possibleCyclesPerSecond < limitingCyclesPerSecond) {
            limitingCyclesPerSecond = possibleCyclesPerSecond
            limitingStackKey = getStackKey(stack)
        }
    })

    if (limitingCyclesPerSecond === undefined) {
        return undefined
    }

    return {
        cyclesPerSecond: limitingCyclesPerSecond,
        limitingStackKey,
    }
}

function getCyclesFromOutputConstraints(recipe: NormalizedExportRecipe, constraintsByRoleAndStack: Map<string, number>): ConstraintCycleResult | undefined {
    let requiredCyclesPerSecond: number | undefined

    recipe.outputs.forEach((stack) => {
        const wantedRate = getConstraintRate(
            constraintsByRoleAndStack,
            'output-wanted',
            stack,
        )

        if (wantedRate === undefined || stack.amount <= 0) {
            return
        }

        const stackRequiredCyclesPerSecond = wantedRate / stack.amount

        if (requiredCyclesPerSecond == undefined || stackRequiredCyclesPerSecond > requiredCyclesPerSecond) {
            requiredCyclesPerSecond = stackRequiredCyclesPerSecond
        }
    })

    if (requiredCyclesPerSecond == undefined) {
        return undefined
    }

    return {
        cyclesPerSecond: requiredCyclesPerSecond,
    }
}

function getConstraintsByRoleAndStack(node: PlannerNode): Map<string, number> {
    const constraintsByRoleAndStack = new Map<string, number>()

    node.stackConstraints?.forEach((constraint) => {
        const ratePerSecond = getPositiveNumber(constraint.ratePerSecond)

        if (ratePerSecond === undefined) {
            return
        }

        constraintsByRoleAndStack.set(
            getConstraintMapKey(constraint.role, constraint.stackKey),
            ratePerSecond,
        )
    })

    return constraintsByRoleAndStack
}

function getConstraintRate(constraintsByRoleAndStack: Map<string, number>, role: PlannerStackConstraintRole, stack: ExportStack): number | undefined {
    return constraintsByRoleAndStack.get(getConstraintMapKey(role, getStackKey(stack)))
}

function getConstraintMapKey(role: PlannerStackConstraintRole, stackKey: StackKey): string {
    return `${role}:${stackKey}`
}

interface CreateStackRateArgs {
    node: PlannerNode
    recipe: NormalizedExportRecipe
    stack: ExportStack
    stackIndex: number
    role: PlannerStackRateRole
    cyclesPerSecond: number
    constraintRatePerSecond: number | undefined
    constraintRole: PlannerStackConstraintRole
    limitingStackKey?: StackKey
    isTargetOutput?: boolean
}

function createStackRate({
    node,
    recipe,
    stack,
    stackIndex,
    role,
    cyclesPerSecond,
    constraintRatePerSecond,
    constraintRole,
    limitingStackKey,
    isTargetOutput = false,
}: CreateStackRateArgs): PlannerStackRate {
    const stackKey = getStackKey(stack)
    const ratePerSecond = stack.amount * cyclesPerSecond
    const excessRatePerSecond =
        constraintRatePerSecond !== undefined
            ? Math.max(
                0,
                role === 'input'
                    ? constraintRatePerSecond - ratePerSecond
                    : ratePerSecond - constraintRatePerSecond,
            )
            : undefined
    const shortageRatePerSecond =
        constraintRatePerSecond !== undefined
            ? Math.max(
                0,
                role === 'input'
                    ? ratePerSecond - constraintRatePerSecond
                    : constraintRatePerSecond - ratePerSecond,
            )
            : undefined

    return {
        nodeId: node.id,
        recipeId: recipe.id,
        stackKey,
        stack,
        stackIndex,
        role,
        constraintRole,
        constraintRatePerSecond,
        ratePerSecond,
        requiredRatePerSecond: role === 'input' ? ratePerSecond : undefined,
        producedRatePerSecond: role === 'output' ? ratePerSecond : undefined,
        excessRatePerSecond,
        shortageRatePerSecond,
        status: getStackRateStatus({
            role,
            isTargetOutput,
            stackKey,
            limitingStackKey,
            constraintRatePerSecond,
            excessRatePerSecond,
            shortageRatePerSecond,
        }),
        perMachineRatePerSecond: getBaseStackRatePerSecond(recipe, stack),
    }
}

interface GetStackRateStatusArgs {
    role: PlannerStackRateRole
    isTargetOutput: boolean
    stackKey: StackKey
    limitingStackKey?: StackKey
    constraintRatePerSecond?: number
    excessRatePerSecond?: number
    shortageRatePerSecond?: number
}

function getStackRateStatus({
    role,
    isTargetOutput,
    stackKey,
    limitingStackKey,
    constraintRatePerSecond,
    excessRatePerSecond = 0,
    shortageRatePerSecond = 0,
}: GetStackRateStatusArgs): PlannerStackRateStatus {
    if (role === 'input') {
        if (constraintRatePerSecond === undefined) {
            return 'unresolved'
        }

        if (stackKey === limitingStackKey) {
            return 'limiting'
        }

        if (shortageRatePerSecond > 0) {
            return 'short'
        }

        if (excessRatePerSecond > 0) {
            return 'excess'
        }

        return 'satisfied'
    }

    if (constraintRatePerSecond !== undefined) {
        if (shortageRatePerSecond > 0) {
            return 'short'
        }

        if (excessRatePerSecond > 0) {
            return 'excess'
        }

        return 'satisfied'
    }

    return isTargetOutput ? 'target' : 'byproduct'
}

function getPowerEstimate(recipe: NormalizedExportRecipe, exactMachineCount: number | undefined, roundedMachineCount: number | undefined): PlannerPowerEstimate | undefined {
    if (exactMachineCount === undefined || roundedMachineCount === undefined) {
        return undefined
    }

    return {
        recipeEuPerTick: recipe.eut,
        exactEuPerTick: recipe.eut * exactMachineCount,
        roundedEuPerTick: recipe.eut * roundedMachineCount,
    }
}

function isEuPoweredRecipe(recipe: NormalizedExportRecipe): boolean {
    return recipe.machine.category === 'GregTech' || recipe.machine.id.startsWith('gregtech:')
}

function getPositiveNumber(value: number | undefined): number | undefined {
    if (value === undefined || !Number.isFinite(value) || value <= 0) {
        return undefined
    }

    return value
}

function getPositiveMachineCount(value: number | undefined): number | undefined {
    if (value === undefined || !Number.isFinite(value) || value <= 0) {
        return undefined
    }

    return Math.max(1, Math.floor(value))
}
