export type VisualGraphNodeKind =
    | 'recipe'
    | 'machine'
    | 'resource'
    | 'base-line'
    | 'bottleneck'
    | 'milestone'
    | 'extension'

export type VisualGraphEdgeStatus =
    | 'satisfied'
    | 'short'
    | 'excess'
    | 'voided'
    | 'imported'
    | 'looped'

export type VisualGraphSeverity = 'info' | 'suggestion' | 'warning' | 'blocker'

export interface VisualGraph {
    nodes: VisualGraphNode[]
    edges: VisualGraphEdge[]
    overlays: VisualGraphOverlay[]
}

export interface VisualGraphNode {
    id: string
    label: string
    kind: VisualGraphNodeKind
    metrics: Record<string, number | string>
    sourceId?: string
    status?: string
    position?: VisualGraphPosition
}

export interface VisualGraphEdge {
    id: string
    from: string
    to: string
    stackKey?: string
    ratePerSecond?: number
    status?: VisualGraphEdgeStatus
    label?: string
    metrics?: Record<string, number | string>
}

export interface VisualGraphOverlay {
    id: string
    kind: 'highlight' | 'heatmap' | 'annotation' | 'selection' | 'warning'
    label?: string
    severity?: VisualGraphSeverity
    nodeIds: string[]
    edgeIds: string[]
    metrics?: Record<string, number | string>
}

export interface VisualGraphPosition {
    x: number
    y: number
}

export interface VisualGraphViewport {
    x: number
    y: number
    zoom: number
}

export const EMPTY_VISUAL_GRAPH: VisualGraph = {
    nodes: [],
    edges: [],
    overlays: [],
}