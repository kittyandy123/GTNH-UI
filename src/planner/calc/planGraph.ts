import type {
    VisualGraph,
    VisualGraphEdge,
    VisualGraphNode,
    VisualGraphOverlay,
} from '../../graph/model/visualGraph'
import type { PlannerPlanSummary, PlannerStackRate } from './planSummary'

export function buildVisualGraphFromPlanSummary(summary: PlannerPlanSummary): VisualGraph {
    const nodes: VisualGraphNode[] = []
    const edges: VisualGraphEdge[] = []

    nodes.push(createRecipeNode(summary))

    summary.inputRates.forEach((rate, index) => {
        const inputNode = createStackNode('input', rate, index, 'unresolved-input')
        nodes.push(inputNode)

        edges.push({
            id: `edge:${inputNode.id}:to:${summary.rootNodeId}`,
            from: inputNode.id,
            to: summary.rootNodeId,
            stackKey: rate.stackKey,
            ratePerSecond: rate.ratePerSecond,
            status: getInputEdgeStatus(rate),
            label: formatRateLabel(rate),
        })
    })

    summary.targetOutputRates.forEach((rate, index) => {
        const outputNode = createStackNode('target-output', rate, index, 'target-output')
        nodes.push(outputNode)

        edges.push({
            id: `edge:${summary.rootNodeId}:to:${outputNode.id}`,
            from: summary.rootNodeId,
            to: outputNode.id,
            stackKey: rate.stackKey,
            ratePerSecond: rate.ratePerSecond,
            status: getOutputEdgeStatus(rate),
            label: formatRateLabel(rate),
        })
    })

    summary.byproductRates.forEach((rate, index) => {
        const byproductNode = createStackNode('byproduct', rate, index, 'byproduct')
        nodes.push(byproductNode)
        edges.push({
            id: `edge:${summary.rootNodeId}:to:${byproductNode.id}`,
            from: summary.rootNodeId,
            to: byproductNode.id,
            stackKey: rate.stackKey,
            ratePerSecond: rate.ratePerSecond,
            status: getOutputEdgeStatus(rate),
            label: formatRateLabel(rate),
        })
    })

    return {
        nodes,
        edges,
        overlays: createGraphOverlays(nodes, edges),
    }
}

function createRecipeNode(summary: PlannerPlanSummary): VisualGraphNode {
    const machineSummary = summary.machineSummaries[0]
    const metrics: Record<string, number | string> = {
        machineCountMode: summary.machineCountMode === 'fixed' ? 'Fixed' : 'Auto',
        solveMode: summary.solveMode === 'from-inputs' ? 'Inputs' : 'Outputs',
    }

    if (summary.operationsPerSecond !== undefined) {
        metrics.operationsPerSecond = summary.operationsPerSecond
    }

    if (summary.exactMachineCount !== undefined) {
        metrics.exactMachines = summary.exactMachineCount
    }

    if (summary.roundedMachineCount !== undefined) {
        metrics.buildMachines = summary.roundedMachineCount
    }

    if (summary.powerEstimate) {
        metrics.installedEuPerTick = summary.powerEstimate.roundedEuPerTick
    }

    return {
        id: summary.rootNodeId,
        label:
            summary.rootRecipe?.outputs[summary.targetOutputIndex]?.displayName ??
            summary.rootRecipe?.outputs[0]?.displayName ??
            machineSummary?.machineName ??
            'Planned recipe',
        kind: 'recipe',
        sourceId: summary.rootRecipe?.id,
        status: 'recipe',
        metrics: {
            machine: machineSummary?.machineName ?? 'Unknown machine',
            ...metrics,
        },
    }
}

function createStackNode(prefix: string, rate: PlannerStackRate, index: number, status: 'unresolved-input' | 'target-output' | 'byproduct'): VisualGraphNode {
    const metrics: Record<string, number | string> = {
        status: rate.status,
        ratePerSecond: rate.ratePerSecond,
        unit: `${rate.stack.unit}/s`,
    }

    if (rate.constraintRatePerSecond !== undefined) {
        metrics.constraintRatePerSecond = rate.constraintRatePerSecond
    }

    if (rate.excessRatePerSecond !== undefined && rate.excessRatePerSecond > 0) {
        metrics.excessPerSecond = rate.excessRatePerSecond
    }

    if (rate.shortageRatePerSecond !== undefined && rate.shortageRatePerSecond > 0) {
        metrics.shortagePerSecond = rate.shortageRatePerSecond
    }

    return {
        id: `${prefix}:${rate.stackKey}:${index}`,
        label: rate.stack.displayName,
        kind: 'resource',
        sourceId: rate.stackKey,
        status,
        metrics,
    }
}

function createGraphOverlays(nodes: VisualGraphNode[], edges: VisualGraphEdge[]): VisualGraphOverlay[] {
    const overlays: VisualGraphOverlay[] = []

    const unresolvedInputNodeIds = nodes
        .filter((node) => node.status === 'unresolved-input')
        .map((node) => node.id)

    if (unresolvedInputNodeIds.length > 0) {
        overlays.push({
            id: 'overlay:unresolved-inputs',
            kind: 'warning',
            label: 'Unresolved inputs',
            severity: 'warning',
            nodeIds: unresolvedInputNodeIds,
            edgeIds: edges
                .filter((edge) => edge.status === 'short')
                .map((edge) => edge.id),
            metrics: {
                count: unresolvedInputNodeIds.length,
            },
        })
    }

    const byproductNodeIds = nodes
        .filter((node) => node.status === 'byproduct')
        .map((node) => node.id)

    if (byproductNodeIds.length > 0) {
        overlays.push({
            id: 'overlay:byproducts',
            kind: 'annotation',
            label: 'Unhandled byproducts',
            severity: 'suggestion',
            nodeIds: byproductNodeIds,
            edgeIds: edges
                .filter((edge) => edge.status === 'excess')
                .map((edge) => edge.id),
            metrics: {
                count: byproductNodeIds.length,
            },
        })
    }

    return overlays
}

function formatRateLabel(rate: PlannerStackRate): string {
    return `${roundRate(rate.ratePerSecond)} ${rate.stack.unit}/s`
}

function roundRate(value: number): string {
    if (value >= 100) {
        return value.toFixed(0)
    }

    if (value >= 10) {
        return value.toFixed(1)
    }

    return value.toFixed(3).replace(/\.?0+$/, '')
}

function getInputEdgeStatus(rate: PlannerStackRate): VisualGraphEdge['status'] {
    if (rate.status === 'short' || rate.status === 'unresolved') {
        return 'short'
    }

    if (rate.status === 'excess') {
        return 'excess'
    }

    return 'satisfied'
}

function getOutputEdgeStatus(rate: PlannerStackRate): VisualGraphEdge['status'] {
    if (rate.status === 'short') {
        return 'short'
    }

    if (rate.status === 'excess' || rate.status === 'byproduct') {
        return 'excess'
    }

    return 'satisfied'
}
