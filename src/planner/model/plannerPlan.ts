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

export const DEFAULT_PLANNER_ASSUMPTIONS: PlannerAssumptions = {
    targetMode: 'continuous',
    defaultRounding: 'exact',
    safetyMarginPercent: 0,
    useBaseSupplies: true,
    allowManualImports: true,
    allowVoids: true,
    allowByproductReuse: true,
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
    return {
        id: createPlannerNodeId(recipe.id),
        kind: 'recipe',
        recipeId: recipe.id,
        targetOutputIndex: 0,
        status: 'planned',
        label: recipe.outputs[0]?.displayName ?? recipe.machine.name,
        machineConfig: {
            machineId: recipe.machine.id,
            machineKind: 'singleblock',
        },
    }
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