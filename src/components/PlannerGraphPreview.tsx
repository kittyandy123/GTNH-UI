import { useState, type KeyboardEvent } from 'react'
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
import type {
    ConstraintSolveMode,
    MachineCountMode,
    PlannerStackConstraintRole,
    StackKey,
} from '../planner/model/plannerPlan'

interface PlannerGraphPreviewProps {
    recipe: NormalizedExportRecipe
    draft: PlannerDraft
    onSelectRecipe: () => void
    onClearPlan: () => void
    onMachineCountModeChange: (machineCountMode: MachineCountMode) => void
    onFixedMachineCountChange: (fixedMachineCount: number | undefined) => void
    onConstraintSolveModeChange: (solveMode: ConstraintSolveMode) => void
    onStackConstraintRateChange: (
        stackKey: StackKey,
        role: PlannerStackConstraintRole,
        ratePerSecond: number | undefined,
    ) => void
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
    onMachineCountModeChange,
    onFixedMachineCountChange,
    onConstraintSolveModeChange,
    onStackConstraintRateChange,
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
                        Main-screen preview for one recipe. Machine count math here uses base
                        recipe timing only; full tier and multiblock behavior belong in planner
                        workspaces later.
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
                        <span>Primary output</span>
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

                <label className="target-output-field">
                    <span>Machine count</span>
                    <select
                        value={summary.machineCountMode}
                        onChange={(event) => {
                            onMachineCountModeChange(event.target.value as MachineCountMode)
                        }}
                    >
                        <option value="auto">Auto calculate</option>
                        <option value="fixed">Fixed count</option>
                    </select>
                </label>

                {summary.machineCountMode === 'fixed' && (
                    <label className="target-rate-field">
                        <span>Fixed machines</span>
                        <input
                            min="0"
                            step="1"
                            type="number"
                            value={summary.fixedMachineCount ?? ''}
                            placeholder="1"
                            onChange={(event) => {
                                onFixedMachineCountChange(parseOptionalPositiveNumber(event.target.value))
                            }}
                        />
                    </label>
                )}

                <label className="target-output-field">
                    <span>Solve from</span>
                    <select
                        value={summary.solveMode}
                        onChange={(event) => {
                            onConstraintSolveModeChange(event.target.value as ConstraintSolveMode)
                        }}
                    >
                        <option value="from-outputs">Wanted outputs</option>
                        <option value="from-inputs">Provided inputs</option>
                    </select>
                </label>
            </div>

            <PlannerPreviewMetrics summary={summary} />

            {summary.assumptionWarnings.length > 0 && (
                <div className="planner-rate-note">
                    {summary.assumptionWarnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                    ))}
                </div>
            )}

            <div className="planner-graph-grid">
                <PlannerGraphColumn
                    title="Inputs"
                    emptyLabel="No inputs"
                    graph={graph}
                    nodes={inputNodes}
                    stackRatesByNodeId={stackRatesByNodeId}
                    solveMode={summary.solveMode}
                    onFindProducers={onFindProducers}
                    onFindUses={onFindUses}
                    onStackConstraintRateChange={onStackConstraintRateChange}
                />

                <PlannerGraphColumn
                    title="Recipe"
                    emptyLabel="No recipe node"
                    graph={graph}
                    nodes={recipeNodes}
                    stackRatesByNodeId={stackRatesByNodeId}
                    solveMode={summary.solveMode}
                    onFindProducers={onFindProducers}
                    onFindUses={onFindUses}
                    onStackConstraintRateChange={onStackConstraintRateChange}
                />

                <PlannerGraphColumn
                    title="Outputs"
                    emptyLabel="No outputs"
                    graph={graph}
                    nodes={outputNodes}
                    stackRatesByNodeId={stackRatesByNodeId}
                    solveMode={summary.solveMode}
                    onFindProducers={onFindProducers}
                    onFindUses={onFindUses}
                    onStackConstraintRateChange={onStackConstraintRateChange}
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
                    Recipe cycles:{' '}
                    <strong>{formatDecimal(summary.operationsPerSecond)} / sec</strong>
                </span>
            )}

            {summary.machineCountMode === 'fixed' ? (
                <span>
                    Machine mode:{' '}
                    <strong>
                        Fixed
                        {summary.fixedMachineCount !== undefined &&
                            ` · ${formatDecimal(summary.fixedMachineCount)} machines`}
                    </strong>
                </span>
            ) : (
                <span>
                    Machine mode:{' '}
                    <strong>Auto calculate</strong>
                </span>
            )}

            {summary.exactMachineCount !== undefined && (
                <span>
                    Machines:{' '}
                    <strong>
                        {formatDecimal(summary.exactMachineCount)} exact
                        {summary.buildMachineCount !== undefined &&
                            ` · build ${formatDecimal(summary.buildMachineCount)}`}
                    </strong>
                </span>
            )}

            {summary.installedCyclesPerSecond !== undefined && (
                <span>
                    Installed capacity:{' '}
                    <strong>{formatDecimal(summary.installedCyclesPerSecond)} cycles/s</strong>
                </span>
            )}

            {summary.powerEstimate ? (
                <>
                    <span>
                        Recipe draw:{' '}
                        <strong>{formatNumber(summary.powerEstimate.recipeEuPerTick)} EU/t</strong>
                    </span>
                    <span>
                        Exact draw:{' '}
                        <strong>{formatDecimal(summary.powerEstimate.exactEuPerTick)} EU/t</strong>
                    </span>
                    <span>
                        Build draw:{' '}
                        <strong>{formatNumber(summary.powerEstimate.roundedEuPerTick)} EU/t</strong>
                    </span>
                </>
            ) : (
                <span>
                    Power:{' '}
                    <strong>
                        {summary.usesEuPower
                            ? 'Unavailable'
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
    solveMode: ConstraintSolveMode
    onFindProducers: (stack: ExportStack) => void
    onFindUses: (stack: ExportStack) => void
    onStackConstraintRateChange: (
        stackKey: StackKey,
        role: PlannerStackConstraintRole,
        ratePerSecond: number | undefined,
    ) => void
}

function PlannerGraphColumn({
    title,
    emptyLabel,
    graph,
    nodes,
    stackRatesByNodeId,
    solveMode,
    onFindProducers,
    onFindUses,
    onStackConstraintRateChange,
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
                            solveMode={solveMode}
                            onFindProducers={onFindProducers}
                            onFindUses={onFindUses}
                            onStackConstraintRateChange={onStackConstraintRateChange}
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
    solveMode: ConstraintSolveMode
    onFindProducers: (stack: ExportStack) => void
    onFindUses: (stack: ExportStack) => void
    onStackConstraintRateChange: (
        stackKey: StackKey,
        role: PlannerStackConstraintRole,
        ratePerSecond: number | undefined,
    ) => void
}

function PlannerGraphNodeCard({
    graph,
    node,
    stackRate,
    solveMode,
    onFindProducers,
    onFindUses,
    onStackConstraintRateChange,
}: PlannerGraphNodeCardProps) {
    const relatedEdges = getRelatedEdges(graph, node)
    const stackAction = getStackAction(node, stackRate, onFindProducers, onFindUses)
    const isActionable = stackAction !== undefined

    function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (event.target !== event.currentTarget) {
            return
        }

        if (!stackAction) {
            return
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            stackAction.onClick()
        }
    }

    const className = [
        'planner-graph-node',
        `planner-graph-node-${node.status ?? node.kind}`,
        stackRate ? `planner-graph-node-rate-${stackRate.status}` : undefined,
        isActionable ? 'planner-graph-node-actionable' : undefined,
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <article
            aria-label={stackAction ? `${stackAction.label} for ${node.label}` : undefined}
            className={className}
            role={isActionable ? 'button' : undefined}
            tabIndex={isActionable ? 0 : undefined}
            onClick={stackAction ? () => stackAction.onClick() : undefined}
            onKeyDown={handleKeyDown}
        >
            <div>
                <span className="planner-graph-node-kind">
                    {getNodeKindLabel(node, stackRate)}
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

            {stackRate && (
                <PlannerStackRateSummary stackRate={stackRate} />
            )}

            {stackRate && (
                <PlannerStackConstraintControl
                    stackRate={stackRate}
                    solveMode={solveMode}
                    onStackConstraintRateChange={onStackConstraintRateChange}
                />
            )}

            {relatedEdges.length > 0 && (
                <div className="planner-graph-edge-labels">
                    {relatedEdges.map((edge) => (
                        <span key={edge.id}>{getEdgeLabel(edge, node)}</span>
                    ))}
                </div>
            )}

            {stackAction && (
                <div
                    className="planner-graph-node-actions"
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                >
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

interface PlannerStackRateSummaryProps {
    stackRate: PlannerStackRate
}

function PlannerStackRateSummary({ stackRate }: PlannerStackRateSummaryProps) {
    return (
        <dl className="planner-graph-node-metrics planner-graph-rate-summary">
            {stackRate.requiredRatePerSecond !== undefined && (
                <div>
                    <dt>Required / sec</dt>
                    <dd>
                        {formatDecimal(stackRate.requiredRatePerSecond)} {stackRate.stack.unit}/s
                    </dd>
                </div>
            )}

            {stackRate.producedRatePerSecond !== undefined && (
                <div>
                    <dt>Produced / sec</dt>
                    <dd>
                        {formatDecimal(stackRate.producedRatePerSecond)} {stackRate.stack.unit}/s
                    </dd>
                </div>
            )}

            {stackRate.constraintRatePerSecond !== undefined && (
                <div>
                    <dt>
                        {stackRate.constraintRole === 'input-provided'
                            ? 'Provided / sec'
                            : 'Wanted / sec'}
                    </dt>
                    <dd>
                        {formatDecimal(stackRate.constraintRatePerSecond)} {stackRate.stack.unit}/s
                    </dd>
                </div>
            )}

            {stackRate.excessRatePerSecond !== undefined && stackRate.excessRatePerSecond > 0 && (
                <div>
                    <dt>Excess / sec</dt>
                    <dd>
                        {formatDecimal(stackRate.excessRatePerSecond)} {stackRate.stack.unit}/s
                    </dd>
                </div>
            )}

            {stackRate.shortageRatePerSecond !== undefined && stackRate.shortageRatePerSecond > 0 && (
                <div>
                    <dt>Short / sec</dt>
                    <dd>
                        {formatDecimal(stackRate.shortageRatePerSecond)} {stackRate.stack.unit}/s
                    </dd>
                </div>
            )}
        </dl>
    )
}

interface PlannerStackConstraintControlProps {
    stackRate: PlannerStackRate
    solveMode: ConstraintSolveMode
    onStackConstraintRateChange: (
        stackKey: StackKey,
        role: PlannerStackConstraintRole,
        ratePerSecond: number | undefined,
    ) => void
}

function PlannerStackConstraintControl({ stackRate, solveMode, onStackConstraintRateChange }: PlannerStackConstraintControlProps) {
    const [inputDraft, setInputDraft] = useState<string | undefined>()

    const constraintRole: PlannerStackConstraintRole = stackRate.role === 'input' ? 'input-provided' : 'output-wanted'

    const isActiveSolveMode = stackRate.role === 'input' ? solveMode === 'from-inputs' : solveMode === 'from-outputs'

    const label = stackRate.role === 'input' ? 'Provided / sec' : 'Wanted / sec'
    const currentValue = inputDraft ?? formatRateInputValue(stackRate.constraintRatePerSecond)

    return (
        <div
            className="planner-graph-node-controls"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <label className="planner-stack-rate-control">
                <span>{label}</span>
                <input
                    min="0"
                    step="0.001"
                    type="number"
                    value={currentValue}
                    placeholder={
                        isActiveSolveMode
                            ? 'optional'
                            : 'saved, but inactive in this solve mode'
                    }
                    onBlur={() => {
                        const parsedValue = parseOptionalPositiveNumber(currentValue)

                        setInputDraft(undefined)
                        onStackConstraintRateChange(
                            stackRate.stackKey,
                            constraintRole,
                            parsedValue,
                        )
                    }}
                    onChange={(event) => {
                        const rawValue = event.target.value.trim()
                        const parsedValue = parseOptionalPositiveNumber(rawValue)

                        setInputDraft(rawValue)
                        onStackConstraintRateChange(
                            stackRate.stackKey,
                            constraintRole,
                            parsedValue,
                        )
                    }}
                />
            </label>

            <p className="planner-stack-constraint-hint">
                Blank or 0 means ignored.{' '}
                {!isActiveSolveMode && 'Switch solve mode or use this constraint.'}
            </p>
        </div>
    )
}

function getStackRatesByNodeId(summary: PlannerPlanSummary): Map<string, PlannerStackRate> {
    const stackRatesByNodeId = new Map<string, PlannerStackRate>()

    summary.inputRates.forEach((rate, index) => {
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

function getNodeKindLabel(node: VisualGraphNode, stackRate: PlannerStackRate | undefined): string {
    if (stackRate?.status === 'limiting') {
        return 'Limiting input'
    }

    if (stackRate?.status === 'short') {
        return 'Short'
    }

    if (stackRate?.status === 'excess') {
        return 'Excess'
    }

    if (stackRate?.status === 'satisfied') {
        return 'Satisfied'
    }

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

function formatRateInputValue(value: number | undefined): string {
    if (value === undefined) {
        return ''
    }

    if (Number.isInteger(value)) {
        return String(value)
    }

    return Number(value.toFixed(6)).toString()
}

function parseOptionalPositiveNumber(value: string): number | undefined {
    const trimmedValue = value.trim()

    if (!trimmedValue) {
        return undefined
    }

    const parsedValue = Number(trimmedValue)

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return undefined
    }

    return parsedValue
}
