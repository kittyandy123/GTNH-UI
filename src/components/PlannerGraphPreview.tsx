import { formatDecimal } from '../lib/recipeHelpers'
import type { NormalizedExportRecipe } from '../lib/normalizeExport'
import type { VisualGraph, VisualGraphEdge, VisualGraphNode } from '../graph/model/visualGraph'
import type { PlannerDraft } from '../planner/model/plannerDraft'
import { buildVisualGraphFromPlanSummary } from '../planner/calc/planGraph'
import { computePlannerDraftSummary } from '../planner/calc/planSummary'

interface PlannerGraphPreviewProps {
    recipe: NormalizedExportRecipe
    draft: PlannerDraft
}

export function PlannerGraphPreview({ recipe, draft }: PlannerGraphPreviewProps) {
    const summary = computePlannerDraftSummary(recipe, draft)
    const graph = buildVisualGraphFromPlanSummary(summary)

    const inputNodes = graph.nodes.filter((node) => node.status === 'unresolved-input')
    const recipeNodes = graph.nodes.filter((node) => node.kind === 'recipe')
    const outputNodes = graph.nodes.filter((node) => node.status === 'target-output' || node.status === 'byproduct')

    return (
        <section className="planner-graph-preview" aria-label="Planner graph preview">
            <div className="panel-heading">
                <p className="eyebrow">Graph preview</p>
                <h2>Single-line plan graph</h2>
                <p>
                    First graph view from the computed plan summary. Inputs are unresolved until producer
                    selection is added.
                </p>
            </div>

            {summary.targetRatePerSecond === undefined && (
                <p className="planner-rate-note">
                    Set a target rate to show scaled graph edges.
                </p>
            )}

            <div className="planner-graph-grid">
                <PlannerGraphColumn
                    title="Unresolved inputs"
                    emptyLabel="No scaled inputs yet"
                    graph={graph}
                    nodes={inputNodes}
                />

                <PlannerGraphColumn
                    title="Recipe"
                    emptyLabel="No recipe node"
                    graph={graph}
                    nodes={recipeNodes}
                />

                <PlannerGraphColumn
                    title="Outputs"
                    emptyLabel="No scaled outputs yet"
                    graph={graph}
                    nodes={outputNodes}
                />
            </div>

            {graph.overlays.length > 0 && (
                <div className="planner-graph-overlays">
                    {graph.overlays.map((overlay) => (
                        <span key={overlay.id}>
                            {overlay.label}: {overlay.metrics?.count ?? overlay.nodeIds.length}
                        </span>
                    ))}
                </div>
            )}
        </section>
    )
}

interface PlannerGraphColumnProps {
    title: string
    emptyLabel: string
    graph: VisualGraph
    nodes: VisualGraphNode[]
}

function PlannerGraphColumn({ title, emptyLabel, graph, nodes }: PlannerGraphColumnProps) {
    return (
        <div className="planner-graph-column">
            <h3>{title}</h3>

            {nodes.length > 0 ? (
                <div className="planner-graph-node-list">
                    {nodes.map((node) => (
                        <PlannerGraphNodeCard
                            key={node.id}
                            graph={graph}
                            node={node}
                        />
                    ))}
                </div>
            ) : (
                <p className="muted-text">{emptyLabel}</p>
            )}
        </div>
    )
}

interface PlannerGraphNodeCardProps {
    graph: VisualGraph
    node: VisualGraphNode
}

function PlannerGraphNodeCard({ graph, node }: PlannerGraphNodeCardProps) {
    const relatedEdges = getRelatedEdges(graph, node)

    return (
        <article className={`planner-graph-node planner-graph-node-${node.status ?? node.kind}`}>
            <div>
                <span className="planner-graph-node-kind">
                    {getNodeKindLabel(node)}
                </span>
                <strong>{node.label}</strong>
            </div>

            {Object.keys(node.metrics).length > 0 && (
                <dl className="planner-graph-node-metrics">
                    {Object.entries(node.metrics).map(([key, value]) => (
                        <div key={key}>
                            <dt>{formatMetricName(key)}</dt>
                            <dd>{formatMetricValue(value)}</dd>
                        </div>
                    ))}
                </dl>
            )}

            {relatedEdges.length > 0 && (
                <div className="planner-graph-edge-labels">
                    {relatedEdges.map((edge) => (
                        <span key={edge.id}>{getEdgeLabel(edge, node)}</span>
                    ))}
                </div>
            )}
        </article>
    )
}

function getRelatedEdges(graph: VisualGraph, node: VisualGraphNode): VisualGraphEdge[] {
    return graph.edges.filter((edge) => edge.from === node.id || edge.to === node.id)
}

function getEdgeLabel(edge: VisualGraphEdge, node: VisualGraphNode): string {
    if (edge.from === node.id) {
        return `→ ${edge.label ?? 'flow'}`
    }

    return `← ${edge.label ?? 'flow'}`
}

function getNodeKindLabel(node: VisualGraphNode): string {
    switch (node.status) {
        case 'unresolved-input':
            return 'Input'
        case 'target-output':
            return 'Target'
        case 'byproduct':
            return 'Byproduct'
        case 'recipe':
            return 'Recipe'
        default:
            return node.kind
    }
}

function formatMetricName(key: string): string {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (firstCharacter) => firstCharacter.toUpperCase())
}

function formatMetricValue(value: number | string): string {
    if (typeof value === 'number') {
        return formatDecimal(value)
    }

    return value
}