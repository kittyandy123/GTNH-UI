import type { NormalizedExportRecipe } from '../../lib/normalizeExport'
import {
    createPlannerPlan,
    DEFAULT_QUICK_PLAN_SETTINGS,
    getDefaultRecipeTargetRatePerSecond,
} from './plannerPlan'
import type {
    ConstraintSolveMode,
    MachineCountMode,
    PlannerNode,
    PlannerPlan,
    PlannerStackConstraintRole,
    StackKey,
} from './plannerPlan'

export interface PlannerDraft {
    plan: PlannerPlan
}

export function createPlannerDraft(recipe: NormalizedExportRecipe): PlannerDraft {
    return {
        plan: createPlannerPlan(recipe),
    }
}

export function getPlannerDraftRootNode(draft: PlannerDraft): PlannerNode | undefined {
    return draft.plan.nodesById[draft.plan.rootNodeId]
}

export function getPlannerDraftRecipeId(draft: PlannerDraft): string | undefined {
    return getPlannerDraftRootNode(draft)?.recipeId
}

export function getPlannerDraftTargetOutputIndex(draft: PlannerDraft): number {
    return getPlannerDraftRootNode(draft)?.targetOutputIndex ?? 0
}

export function getPlannerDraftTargetRatePerSecond(draft: PlannerDraft): number | undefined {
    return getPlannerDraftRootNode(draft)?.targetRatePerSecond
}

export function setPlannerDraftTargetRatePerSecond(draft: PlannerDraft, targetRatePerSecond: number | undefined, recipe?: NormalizedExportRecipe): PlannerDraft {
    return updatePlannerDraftRootNode(draft, (rootNode) => {
        const fallbackRate = getFallbackTargetRatePerSecond(draft, recipe)
        const normalizedTargetRate =
            targetRatePerSecond !== undefined && targetRatePerSecond > 0
                ? targetRatePerSecond
                : fallbackRate

        return {
            ...rootNode,
            targetRatePerSecond: normalizedTargetRate,
        }
    })
}

export function setPlannerDraftTargetOutputIndex(draft: PlannerDraft, targetOutputIndex: number, recipe?: NormalizedExportRecipe): PlannerDraft {
    return updatePlannerDraftRootNode(draft, (rootNode) => {
        const normalizedTargetOutputIndex = normalizeTargetOutputIndex(
            targetOutputIndex,
            recipe,
        )

        return {
            ...rootNode,
            targetOutputIndex: normalizedTargetOutputIndex,
            targetRatePerSecond: recipe
                ? getDefaultRecipeTargetRatePerSecond(recipe, normalizedTargetOutputIndex)
                : rootNode.targetRatePerSecond,
        }
    })
}

function getFallbackTargetRatePerSecond(draft: PlannerDraft, recipe: NormalizedExportRecipe | undefined): number {
    const rootNode = getPlannerDraftRootNode(draft)

    if (recipe) {
        return getDefaultRecipeTargetRatePerSecond(
            recipe,
            rootNode?.targetOutputIndex ?? 0,
        )
    }

    if (rootNode?.targetRatePerSecond !== undefined && rootNode.targetRatePerSecond > 0) {
        return rootNode.targetRatePerSecond
    }

    return 1
}

function normalizeTargetOutputIndex(targetOutputIndex: number, recipe: NormalizedExportRecipe | undefined): number {
    if (!Number.isFinite(targetOutputIndex) || targetOutputIndex < 0) {
        return 0
    }

    if (recipe && targetOutputIndex >= recipe.outputs.length) {
        return 0
    }

    return targetOutputIndex
}

function updatePlannerDraftRootNode(draft: PlannerDraft, updateRootNode: (rootNode: PlannerNode) => PlannerNode): PlannerDraft {
    const rootNode = getPlannerDraftRootNode(draft)

    if (!rootNode) {
        return draft
    }

    const updatedRootNode = updateRootNode(rootNode)

    return {
        ...draft,
        plan: {
            ...draft.plan,
            nodesById: {
                ...draft.plan.nodesById,
                [updatedRootNode.id]: updatedRootNode,
            },
            viewState: {
                ...draft.plan.viewState,
                selectedNodeId: updatedRootNode.id,
            },
        },
    }
}

export function setPlannerDraftMachineCountMode(draft: PlannerDraft, machineCountMode: MachineCountMode): PlannerDraft {
    return updatePlannerDraftRootNode(draft, (rootNode) => ({
        ...rootNode,
        quickPlanSettings: {
            ...DEFAULT_QUICK_PLAN_SETTINGS,
            ...rootNode.quickPlanSettings,
            machineCountMode,
            fixedMachineCount:
                machineCountMode === 'fixed'
                    ? normalizePositiveMachineCount(
                        rootNode.quickPlanSettings?.fixedMachineCount,
                    ) ?? 1
                    : rootNode.quickPlanSettings?.fixedMachineCount,
        },
    }))
}

export function setPlannerDraftFixedMachineCount(draft: PlannerDraft, fixedMachineCount: number | undefined): PlannerDraft {
    return updatePlannerDraftRootNode(draft, (rootNode) => ({
        ...rootNode,
        quickPlanSettings: {
            ...DEFAULT_QUICK_PLAN_SETTINGS,
            ...rootNode.quickPlanSettings,
            machineCountMode: 'fixed',
            fixedMachineCount: normalizePositiveMachineCount(fixedMachineCount),
        },
    }))
}

export function setPlannerDraftConstraintSolveMode(draft: PlannerDraft, solveMode: ConstraintSolveMode): PlannerDraft {
    return updatePlannerDraftRootNode(draft, (rootNode) => ({
        ...rootNode,
        quickPlanSettings: {
            ...DEFAULT_QUICK_PLAN_SETTINGS,
            ...rootNode.quickPlanSettings,
            solveMode,
        },
    }))
}

export function setPlannerDraftStackConstraintRate(draft: PlannerDraft, stackKey: StackKey, role: PlannerStackConstraintRole, ratePerSecond: number | undefined): PlannerDraft {
    return updatePlannerDraftRootNode(draft, (rootNode) => {
        const normalizedRate = normalizePositiveNumber(ratePerSecond)
        const existingConstraints = rootNode.stackConstraints ?? []
        const nextConstraints = existingConstraints.filter(
            (constraint) => !(constraint.stackKey === stackKey && constraint.role === role),
        )

        if (normalizedRate !== undefined) {
            nextConstraints.push({
                stackKey,
                role,
                ratePerSecond: normalizedRate,
            })
        }

        return {
            ...rootNode,
            stackConstraints: nextConstraints,
        }
    })
}

function normalizePositiveNumber(value: number | undefined): number | undefined {
    if (value === undefined || !Number.isFinite(value) || value <= 0) {
        return undefined
    }

    return value
}

function normalizePositiveMachineCount(value: number | undefined): number | undefined {
    if (value === undefined || !Number.isFinite(value) || value <= 0) {
        return undefined
    }

    return Math.max(1, Math.floor(value))
}
