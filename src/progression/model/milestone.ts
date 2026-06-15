export type GtnhTier =
    | 'steam'
    | 'lv'
    | 'mv'
    | 'hv'
    | 'ev'
    | 'iv'
    | 'luv'
    | 'zpm'
    | 'uv'
    | 'uhv'
    | 'uev'
    | 'uiv'
    | 'umv'
    | 'uxv'
    | 'max'
    | 'unknown'

export interface MilestoneProfile {
    id: string
    name: string
    tier: GtnhTier
    description?: string
    unlockedMachines: string[]
    unlockedMultiblocks: string[]
    unlockedLogistics: string[]
    recommendedLines: string[]
    commonBottlenecks: string[]
    temporaryLines: string[]
    futureProofLines: string[]
    notes?: string
}

export interface MultistoneUnlock {
    id: string
    name: string
    tier: GtnhTier
    kind: 'machine' | 'multiblock' | 'logistics' | 'resource' | 'power' | 'extension'
    referenceId?: string
    notes?: string
}

export interface ProgressionProfileSelection {
    profileId: string
    selectedMilestoneIds: string[]
    currentTierOverride?: GtnhTier
}

export const UNKNOWN_MILESTONE_PROFILE_ID = 'unknown'