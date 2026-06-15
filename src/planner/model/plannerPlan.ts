import type { NormalizedExportRecipe } from '../../lib/normalizeExport'

export interface PlannerPlan {
    rootNodeId: string
    nodesById: Record<string, PlannerNode>
}

export interface PlannerNode {
    id: string
    recipeId: string
    targetOutputIndex: number
    targetRatePerSecond?: number
    inputLinks: PlannerInputLink[]
}

export interface PlannerInputLink {
    inputIndex: number
    producerNodeId: string
}

export function createPlannerPlan(recipe: NormalizedExportRecipe): PlannerPlan {
    const rootNode = createPlannerNode(recipe)

    return {
        rootNodeId: rootNode.id,
        nodesById: {
            [rootNode.id]: rootNode,
        },
    }
}

export function createPlannerNode(recipe: NormalizedExportRecipe): PlannerNode {
    return {
        id: createPlannerNodeId(recipe.id),
        recipeId: recipe.id,
        targetOutputIndex: 0,
        inputLinks: [],
    }
}

function createPlannerNodeId(recipeId: string): string {
    return `node:${recipeId}`
}