import type { NormalizedExportRecipe } from '../../lib/normalizeExport'
import type { ExportStack } from '../../types/recipe'
import type { PlannerDraft } from '../model/plannerDraft'

export function getPlannerTargetOutput(recipe: NormalizedExportRecipe, draft: PlannerDraft): ExportStack | undefined {
    return recipe.outputs[draft.targetOutputIndex] ?? recipe.outputs[0]
}

export function getBaseOutputRatePerSecond(recipe: NormalizedExportRecipe, draft: PlannerDraft): number | undefined {
    const targetOutput = getPlannerTargetOutput(recipe, draft)

    if (!targetOutput || recipe.durationSeconds <= 0) {
        return undefined
    }

    return targetOutput.amount / recipe.durationSeconds
}

export function getRequiredMachineCount(recipe: NormalizedExportRecipe, draft: PlannerDraft): number | undefined {
    const targetRate = draft.targetRatePerSecond
    const baseRate = getBaseOutputRatePerSecond(recipe, draft)

    if (targetRate === undefined || targetRate <= 0 || baseRate === undefined || baseRate <= 0) {
        return undefined
    }

    return targetRate / baseRate
}

export function getRoundedRequiredMachineCount(recipe: NormalizedExportRecipe, draft: PlannerDraft): number | undefined {
    const requiredMachines = getRequiredMachineCount(recipe, draft)

    if (requiredMachines === undefined) {
        return undefined
    }

    return Math.ceil(requiredMachines)
}

export interface PlannerStackRate {
    stack: ExportStack
    ratePerSecond: number
}

export function getRecipeOperationsPerSecond(recipe: NormalizedExportRecipe, draft: PlannerDraft): number | undefined {
    const targetRate = draft.targetRatePerSecond
    const targetOutput = getPlannerTargetOutput(recipe, draft)

    if (targetRate === undefined || targetRate <= 0 || !targetOutput || targetOutput.amount <= 0) {
        return undefined
    }

    return targetRate / targetOutput.amount
}

export function getPlannedInputRates(recipe: NormalizedExportRecipe, draft: PlannerDraft): PlannerStackRate[] {
    const operationsPerSecond = getRecipeOperationsPerSecond(recipe, draft)

    if (operationsPerSecond === undefined) {
        return []
    }

    return recipe.inputs.map((stack) => ({
        stack,
        ratePerSecond: stack.amount * operationsPerSecond,
    }))
}

export function getPlannedOutputRates(recipe: NormalizedExportRecipe, draft: PlannerDraft): PlannerStackRate[] {
    const operationsPerSecond = getRecipeOperationsPerSecond(recipe, draft)

    if (operationsPerSecond === undefined) {
        return []
    }

    return recipe.outputs.map((stack) => ({
        stack,
        ratePerSecond: stack.amount * operationsPerSecond,
    }))
}