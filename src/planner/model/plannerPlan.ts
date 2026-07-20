import type { NormalizedExportRecipe } from '../../lib/normalizeExport'
import type { GtnhTier } from '../../progression/model/milestone'

export type StackKey = string

export type PlannerNodeKind =
    | 'recipe'
    | 'base-supply'
    | 'manual-import'
    | 'stockpile'
    | 'void'
    | 'passive-source'
    | 'note'

export type PlannerNodeStatus =
    | 'planned'
    | 'built'
    | 'measured'
    | 'stale'
    | 'disabled'

export type PlannerEdgeStatus =
    | 'satisfied'
    | 'short'
    | 'excess'
    | 'voided'
    | 'imported'
    | 'looped'

export type PlannerTargetMode =
    | 'continuous'
    | 'batch'
    | 'on-demand'
    | 'passive'

export type PlannerRoundingMode = 'exact' | 'ceil' | 'safety-margin'

export interface PlannerPlan {
    id: string
    name: string
    rootNodeId: string
    nodesById: Record<string, PlannerNode>
    edgesById: Record<string, PlannerEdge>
    assumptions: PlannerAssumptions
    viewState: PlannerViewState
}

export interface PlannerNode {
    id: string
    kind: PlannerNodeKind
    recipeId?: string
    targetStackKey?: StackKey
    targetOutputIndex?: number
    targetRatePerSecond?: number
    machineConfig?: MachineConfig
    status: PlannerNodeStatus
    label?: string
    notes?: string
    quickPlanSettings?: PlannerNodeQuickPlanSettings
    stackConstraints?: PlannerStackConstraint[]
}

export interface PlannerEdge {
    id: string
    fromNodeId: string
    toNodeId: string
    stackKey: StackKey
    ratePerSecond: number
    status: PlannerEdgeStatus
    label?: string
}

export interface PlannerAssumptions {
    targetMode: PlannerTargetMode
    defaultRounding: PlannerRoundingMode
    safetyMarginPercent: number
    useBaseSupplies: boolean
    allowManualImports: boolean
    allowVoids: boolean
    allowByproductReuse: boolean
    progressionProfileId?: string
}

export interface PlannerViewState {
    selectedNodeId?: string
    selectedEdgeId?: string
    collapsedNodeIds: string[]
    focusedStackKey?: StackKey
}

export interface MachineConfig {
    machineId: string
    machineTier?: GtnhTier
    machineLevel?: string
    machineKind: 'singleblock' | 'multiblock' | 'parallel-controller' | 'extension-source'
    overclockCount?: number
    parallelCount?: number
    voltageTier?: GtnhTier
    amperage?: number
    coilTier?: string
    enabledUpgrades?: string[]
}

export type MachineCountMode = 'auto' | 'fixed'
export type ConstraintSolveMode = 'from-inputs' | 'from-outputs'
export type PlannerStackConstraintRole = 'input-provided' | 'output-wanted'

export interface PlannerNodeQuickPlanSettings {
    machineCountMode: MachineCountMode
    fixedMachineCount?: number
    solveMode: ConstraintSolveMode
    baseTimingOnly: true
}

export interface PlannerStackConstraint {
    stackKey: StackKey
    role: PlannerStackConstraintRole
    ratePerSecond?: number
}

export const DEFAULT_PLANNER_ASSUMPTIONS: PlannerAssumptions = {
    targetMode: 'continuous',
    defaultRounding: 'exact',
    safetyMarginPercent: 0,
    useBaseSupplies: true,
    allowManualImports: true,
    allowVoids: true,
    allowByproductReuse: true,
}

export const DEFAULT_QUICK_PLAN_SETTINGS: PlannerNodeQuickPlanSettings = {
    machineCountMode: 'auto',
    solveMode: 'from-outputs',
    baseTimingOnly: true,
}

export function createPlannerPlan(recipe: NormalizedExportRecipe): PlannerPlan {
    const rootNode = createRecipePlannerNode(recipe)

    return {
        id: createPlannerPlanId(recipe.id),
        name: getDefaultPlanName(recipe),
        rootNodeId: rootNode.id,
        nodesById: {
            [rootNode.id]: rootNode,
        },
        edgesById: {},
        assumptions: { ...DEFAULT_PLANNER_ASSUMPTIONS },
        viewState: {
            selectedNodeId: rootNode.id,
            collapsedNodeIds: [],
        },
    }
}

export function createRecipePlannerNode(recipe: NormalizedExportRecipe): PlannerNode {
    const targetOutputIndex = 0

    return {
        id: createPlannerNodeId(recipe.id),
        kind: 'recipe',
        recipeId: recipe.id,
        targetOutputIndex,
        status: 'planned',
        label: recipe.outputs[0]?.displayName ?? recipe.machine.name,
        quickPlanSettings: { ...DEFAULT_QUICK_PLAN_SETTINGS },
        stackConstraints: [],
        machineConfig: {
            machineId: recipe.machine.id,
            machineKind: 'singleblock',
        },
    }
}

export function getDefaultRecipeTargetRatePerSecond(recipe: NormalizedExportRecipe, targetOutputIndex = 0): number {
    const targetOutput = recipe.outputs[targetOutputIndex] ?? recipe.outputs[0]

    if (!targetOutput || recipe.durationSeconds <= 0 || targetOutput.amount <= 0) {
        return 1
    }

    return targetOutput.amount / recipe.durationSeconds
}

export function createPlannerNodeId(recipeId: string): string {
    return `node:${recipeId}`
}

export function createPlannerPlanId(recipeId: string): string {
    return `plan:${recipeId}`
}

function getDefaultPlanName(recipe: NormalizedExportRecipe): string {
    const firstOutput = recipe.outputs[0]

    if (firstOutput) {
        return `${firstOutput.displayName} line`
    }

    return `${recipe.machine.name} line`
}