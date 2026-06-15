import type { NormalizedExportRecipe } from '../../lib/normalizeExport'
import { createPlannerPlan } from './plannerPlan'
import type { PlannerNode, PlannerPlan } from './plannerPlan'

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

export function setPlannerDraftTargetRatePerSecond(draft: PlannerDraft, targetRatePerSecond: number | undefined): PlannerDraft {
    const normalizedTargetRate = targetRatePerSecond !== undefined && targetRatePerSecond > 0
        ? targetRatePerSecond
        : undefined

    return updatePlannerDraftRootNode(draft, (rootNode) => ({
        ...rootNode,
        targetRatePerSecond: normalizedTargetRate,
    }))
}

export function setPlannerDraftTargetOutputIndex(draft: PlannerDraft, targetOutputIndex: number): PlannerDraft {
    return updatePlannerDraftRootNode(draft, (rootNode) => ({
        ...rootNode,
        targetOutputIndex: Math.max(0, targetOutputIndex),
        targetRatePerSecond: undefined,
    }))
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