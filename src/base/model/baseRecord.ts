import type { GtnhTier } from '../../progression/model/milestone'

export type StackKey = string

export type BaseLineMode =
    | 'manual'
    | 'batch'
    | 'passive'
    | 'continuous'
    | 'on-demand'
    | 'stock-maintained'

export type BaseLifecycleStatus =
    | 'planned'
    | 'built'
    | 'measured'
    | 'stale'
    | 'decommissioned'

export interface BaseRecord {
    id: string
    name: string
    currentTier: GtnhTier
    milestones: string[]
    powerSystems: BasePowerSystem[]
    lines: BaseLine[]
    machines: BaseMachine[]
    stockpiles: BaseStockpile[]
    resourceSignals: BaseResourceSignal[]
    notes: BaseNote[]
}

export interface BasePowerSystem {
    id: string
    name: string
    kind?: string
    stableEuPerTick?: number
    peakEuPerTick?: number
    storageEu?: number
    voltageTier?: GtnhTier
    notes?: string
}

export interface BaseLine {
    id: string
    name: string
    mode: BaseLineMode
    status: BaseLifecycleStatus
    inputs: MeasuredStackRate[]
    outputs: MeasuredStackRate[]
    bottlenecks: string[]
    associatedPlanId?: string
    notes?: string
}

export interface BaseMachine {
    id: string
    machineId: string
    displayName: string
    count: number
    machineTier?: GtnhTier
    machineKind?: 'singleblock' | 'multiblock' | 'parallel-controller' | 'extension-source'
    status?: 'available' | 'in-use' | 'reserved' | 'disabled'
    associatedLineIds?: string[]
    notes?: string
}

export interface BaseStockpile {
    id: string
    stackKey: StackKey
    displayName?: string
    amount?: number
    targetAmount?: number
    trend?: 'increasing' | 'stable' | 'decreasing' | 'unknown'
    source: 'manual' | 'imported-snapshot' | 'live-snapshot'
    updatedAt?: string
    notes?: string
}

export interface BaseResourceSignal {
    id: string
    stackKey: StackKey
    displayName?: string
    trend: 'increasing' | 'stable' | 'decreasing' | 'unknown'
    measuredRatePerSecond?: number
    source: 'manual' | 'imported-snapshot' | 'live-snapshot'
    updatedAt?: string
    notes?: string
}

export interface MeasuredStackRate {
    stackKey: StackKey
    displayName?: string
    ratePerSecond: number
    unit?: 'items' | 'L' | string
    source: 'manual' | 'estimated' | 'imported-snapshot' | 'live-snapshot'
}

export interface BaseNote {
    id: string
    title?: string
    body: string
    createdAt?: string
    updatedAt?: string
}