import type { VisualGraph, VisualGraphOverlay } from '../../graph/model/visualGraph'
import type { PlannerNodeKind, PlannerPlan } from '../../planner/model/plannerPlan'
import type { MilestoneProfile } from '../../progression/model/milestone'

export interface PlannerExtension {
    id: string
    name: string
    version: string
    description?: string
    providesResourceTypes?: ResourceTypeDefinition[]
    providesNodeKinds?: PlannerNodeKindDefinition[]
    providesRecommendationRules?: RecommendationRule[]
    providesGraphDecorators?: GraphDecorator[]
    providesWorkspacePanels?: WorkspacePanelDefinition[]
    providesMilestoneProfiles?: MilestoneProfile[]
}

export interface ResourceTypeDefinition {
    id: string
    name: string
    kind: 'item' | 'fluid' | 'power' | 'aspect' | 'mana' | 'lp' | 'other'
    defaultUnit?: string
    description?: string
}

export interface PlannerNodeKindDefinition {
    kind: PlannerNodeKind | string
    name: string
    description?: string
    defaultStatus?: string
}

export interface RecommendationRule {
    id: string
    category:
        | 'bottleneck'
        | 'upgrade'
        | 'automation'
        | 'power'
        | 'milestone'
        | 'byproduct'
        | 'logistics'
        | 'extension'
    severity: 'info' | 'suggestion' | 'warning' | 'blocker'
    title: string
    evaluate?: RecommendationRuleEvaluator
}

export type RecommendationRuleEvaluator = (
    context: RecommendationRuleContext,
) => ExtensionRecommendation[]

export interface RecommendationRuleContext {
    plan: PlannerPlan
    extensionId: string
    baseRecordId?: string
    progressionProfileId?: string
}

export interface ExtensionRecommendation {
    id: string
    severity: 'info' | 'suggestion' | 'warning' | 'blocker'
    category:
        | 'bottleneck'
        | 'upgrade'
        | 'automation'
        | 'power'
        | 'milestone'
        | 'byproduct'
        | 'logistics'
        | 'extension'
    title: string
    explanation: string
    relatedNodeIds: string[]
    relatedStackKeys: string[]
    actions: RecommendationAction[]
}

export interface RecommendationAction {
    id: string
    label: string
    kind: 'select-node' | 'select-stack' | 'add-node' | 'open-workspace' | 'external-link'
    targetId?: string
}

export interface GraphDecorator {
    id: string
    name: string
    decorate?: GraphDecoratorFunction
}

export type GraphDecoratorFunction = (
    graph: VisualGraph,
    context: GraphDecoratorContext,
) => VisualGraphOverlay[]

export interface GraphDecoratorContext {
    plan: PlannerPlan
    extensionId: string
}

export interface WorkspacePanelDefinition {
    id: string
    workspaceId:
        | 'recipe-browser'
        | 'planner'
        | 'graph-lab'
        | 'base-dashboard'
        | 'progression'
        | 'data-manager'
    title: string
    description?: string
}

export interface ExtensionRegistry {
    extensionById: Record<string, PlannerExtension>
    enabledExtensionIds: string[]
}