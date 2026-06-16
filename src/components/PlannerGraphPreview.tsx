import {
    formatDecimal,
    formatNumber,
    formatStackCompact,
} from '../lib/recipeHelpers'
import type { NormalizedExportRecipe } from '../lib/normalizeExport'
import type { VisualGraph, VisualGraphEdge, VisualGraphNode } from '../graph/model/visualGraph'
import type { PlannerDraft } from '../planner/model/plannerDraft'
import { buildVisualGraphFromPlanSummary } from '../planner/calc/planGraph'
import {
    computePlannerDraftSummary,
    type PlannerPlanSummary,
    type PlannerStackRate,
} from '../planner/calc/planSummary'
import type { ExportStack } from '../types/recipe'

interface PlannerGraphPreviewProps {
    recipe: NormalizedExportRecipe
    draft: PlannerDraft
    onSelectRecipe: () => void
    onClearPlan: () => void
    onTargetRateChange: (targetRatePerSecond: number | undefined) => void
    onTargetOutputIndexChange: (targetOutputIndex: number) => void
    onFindProducers: (stack: ExportStack) => void
    onFindUses: (stack: ExportStack) => void
    onOpenPlannerView?: () => void
}

export function PlannerGraphPreview({
    recipe,
    draft,
    onSelectRecipe,
    onClearPlan,
    onTargetRateChange,
    onTargetOutputIndexChange,
    onFindProducers,
    onFindUses,
    onOpenPlannerView,
}: PlannerGraphPreviewProps) {
    const summary = computePlannerDraftSummary(recipe, draft)
    const graph = buildVisualGraphFromPlanSummary(summary)
    const stackRatesByNodeId = getStackRatesByNodeId(summary)

    const inputNodes = graph.nodes.filter((node) => node.status === 'unresolved-input')
    const recipeNodes = graph.nodes.filter((node) => node.kind === 'recipe')
    const outputNodes = graph.nodes.filter((node) => node.status === 'target-output' || node.status === 'byproduct')

    return (
        <section className="planner-graph-preview" aria-label="Planner graph preview">
            <div className="planner-preview-heading">
                <div>
                    <p className="eyebrow">Graph preview</p>
                    <h2>Single-line plan graph</h2>
                    <p>
                        Main-screen preview for the selected recipe. Open a named planner workspace
                        for recursive planning.
                    </p>
                </div>

                <div className="planner-preview-actions">
                    <button
                        className="primary-action-button"
                        type="button"
                        disabled={!onOpenPlannerView}
                        title={
                        onOpenPlannerView
                            ? undefined
                            : 'Named planner workspaces are the next implementation step.'
                        }
                        onClick={onOpenPlannerView}
                    >
                        Open in planner view
                    </button>

                    <button className="secondary-action-button" type="button" onClick={onSelectRecipe}>
                        View recipe
                    </button>

                    <button className="secondary-action-button" type="button" onClick={onClearPlan}>
                        Clear preview
                    </button>
                </div>
            </div>

            <div className="planner-preview-controls">
                {recipe.outputs.length > 1 && (
                    <label className="target-output-field">
                        <span>Target output</span>
                        <select
                            value={summary.targetOutputIndex}
                            onChange={(event) => {
                                onTargetOutputIndexChange(Number(event.target.value))
                            }}
                        >
                            {recipe.outputs.map((output, index) => (
                                <option
                                    key={`${output.kind}:${output.id}:${output.meta}:${index}`}
                                    value={index}
                                >
                                    {formatStackCompact(output)}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                <label className="target-rate-field">
                    <span>Target / sec</span>
                    <input
                        min="0"
                        step="1"
                        type="number"
                        value={summary.targetRatePerSecond ?? ''}
                        onChange={(event) => {
                            const rawValue = event.target.value.trim()

                            if (rawValue === '') {
                                onTargetRateChange(undefined)
                                return
                            }

                            const parsedValue = Number(rawValue)

                            onTargetRateChange(
                                Number.isFinite(parsedValue) && parsedValue > 0
                                    ? parsedValue
                                    : undefined,
                            )
                        }}
                    />

                    <div className="target-rate-presets">
                        {[1, 5, 10].map((rate) => (
                            <button
                                key={rate}
                                type="button"
                                onClick={() => onTargetRateChange(rate)}
                            >
                                {rate}/s
                            </button>
                        ))}

                        <button type="button" onClick={() => onTargetRateChange(undefined)}>
                            Clear
                        </button>
                    </div>
                </label>
            </div>

            <PlannerPreviewMetrics summary={summary} />

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
                    stackRatesByNodeId={stackRatesByNodeId}
                    onFindProducers={onFindProducers}
                    onFindUses={onFindUses}
                />

                <PlannerGraphColumn
                    title="Recipe"
                    emptyLabel="No recipe node"
                    graph={graph}
                    nodes={recipeNodes}
                    stackRatesByNodeId={stackRatesByNodeId}
                    onFindProducers={onFindProducers}
                    onFindUses={onFindUses}
                />

                <PlannerGraphColumn
                    title="Outputs"
                    emptyLabel="No scaled outputs yet"
                    graph={graph}
                    nodes={outputNodes}
                    stackRatesByNodeId={stackRatesByNodeId}
                    onFindProducers={onFindProducers}
                    onFindUses={onFindUses}
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

interface PlannerPreviewMetricsProps {
    summary: PlannerPlanSummary
}

function PlannerPreviewMetrics({ summary }: PlannerPreviewMetricsProps) {
    return (
        <div className="planner-preview-metrics">
            {summary.targetOutput && (
                <span>
                    Target:{' '}
                    <strong>{formatStackCompact(summary.targetOutput)}</strong>
                </span>
            )}

            {summary.baseTargetRatePerSecond !== undefined && summary.targetOutput && (
                <span>
                    Base rate:{' '}
                    <strong>
                        {formatDecimal(summary.baseTargetRatePerSecond)}{' '}
                        {summary.targetOutput.unit}/s
                    </strong>
                </span>
            )}

            {summary.operationsPerSecond !== undefined && (
                <span>
                    Recipe operations:{' '}
                    <strong>{formatDecimal(summary.operationsPerSecond)} / sec</strong>
                </span>
            )}

            {summary.exactMachineCount !== undefined && (
                <span>
                    Machines:{' '}
                    <strong>
                        {formatDecimal(summary.exactMachineCount)} exact
                        {summary.roundedMachineCount !== undefined &&
                            ` · build ${summary.roundedMachineCount}`}
                    </strong>
                </span>
            )}

            {summary.powerEstimate ? (
                <>
                    <span>
                        Recipe draw:{' '}
                        <strong>{formatNumber(summary.powerEstimate.recipeEuPerTick)} EU/t</strong>
                    </span>
                    <span>
                        Average draw:{' '}
                        <strong>{formatDecimal(summary.powerEstimate.exactEuPerTick)} EU/t</strong>
                    </span>
                    <span>
                        Installed draw:{' '}
                        <strong>{formatNumber(summary.powerEstimate.roundedEuPerTick)} EU/t</strong>
                    </span>
                </>
            ) : (
                <span>
                    Power:{' '}
                    <strong>
                        {summary.usesEuPower
                            ? 'Set a target rate to estimate EU/t'
                            : 'Not EU-powered / fuel-based'}
                    </strong>
                </span>
            )}
        </div>
    )
}

interface PlannerGraphColumnProps {
    title: string
    emptyLabel: string
    graph: VisualGraph
    nodes: VisualGraphNode[]
    stackRatesByNodeId: Map<string, PlannerStackRate>
    onFindProducers: (stack: ExportStack) => void
    onFindUses: (stack: ExportStack) => void
}

function PlannerGraphColumn({
    title,
    emptyLabel,
    graph,
    nodes,
    stackRatesByNodeId,
    onFindProducers,
    onFindUses,
}: PlannerGraphColumnProps) {
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
                            stackRate={stackRatesByNodeId.get(node.id)}
                            onFindProducers={onFindProducers}
                            onFindUses={onFindUses}
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
    stackRate: PlannerStackRate | undefined
    onFindProducers: (stack: ExportStack) => void
    onFindUses: (stack: ExportStack) => void
}

function PlannerGraphNodeCard({
    graph,
    node,
    stackRate,
    onFindProducers,
    onFindUses,
}: PlannerGraphNodeCardProps) {
    const relatedEdges = getRelatedEdges(graph, node)
    const stackAction = getStackAction(node, stackRate, onFindProducers, onFindUses)

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

            {stackAction && (
                <div className="planner-graph-node-actions">
                    <button
                        className="stack-action-button"
                        type="button"
                        onClick={stackAction.onClick}
                    >
                        {stackAction.label}
                    </button>
                </div>
            )}
        </article>
    )
}

function getStackRatesByNodeId(summary: PlannerPlanSummary): Map<string, PlannerStackRate> {
    const stackRatesByNodeId = new Map<string, PlannerStackRate>()

    summary.unresolvedInputRates.forEach((rate, index) => {
        stackRatesByNodeId.set(`input:${rate.stackKey}:${index}`, rate)
    })

    summary.targetOutputRates.forEach((rate, index) => {
        stackRatesByNodeId.set(`target-output:${rate.stackKey}:${index}`, rate)
    })

    summary.byproductRates.forEach((rate, index) => {
        stackRatesByNodeId.set(`byproduct:${rate.stackKey}:${index}`, rate)
    })

    return stackRatesByNodeId
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

function getStackAction(
    node: VisualGraphNode,
    stackRate: PlannerStackRate | undefined,
    onFindProducers: (stack: ExportStack) => void,
    onFindUses: (stack: ExportStack) => void,
): { label: string; onClick: () => void } | undefined {
    if (!stackRate) {
        return undefined
    }

    if (node.status === 'unresolved-input') {
        return {
            label: 'Find producers',
            onClick: () => onFindProducers(stackRate.stack),
        }
    }

    if (node.status === 'target-output' || node.status === 'byproduct') {
        return {
            label: 'Find uses',
            onClick: () => onFindUses(stackRate.stack),
        }
    }

    return undefined
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