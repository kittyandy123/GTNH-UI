import { formatDecimal, formatNumber, formatStackIdentity } from '../lib/recipeHelpers'
import type { NormalizedExportRecipe } from '../lib/normalizeExport'
import {
    getPlannerDraftTargetRatePerSecond,
    type PlannerDraft,
} from '../planner/model/plannerDraft'
import {
    getPerMachineStackRate,
    getPlannedInputRates,
    getPlannedOutputRates,
    getPlannerPowerEstimate,
    getPlannerTargetOutput,
    getRecipeOperationsPerSecond,
    type PlannerStackRate
} from '../planner/calc/rates'
import type { ExportStack } from '../types/recipe'

interface PlannerRateBreakdownProps {
    recipe: NormalizedExportRecipe
    draft: PlannerDraft
    onFindProducers: (stack: ExportStack) => void
    onFindUses: (stack: ExportStack) => void
}

export function PlannerRateBreakdown({ recipe, draft, onFindProducers, onFindUses }: PlannerRateBreakdownProps) {
    const inputRates = getPlannedInputRates(recipe, draft)
    const outputRates = getPlannedOutputRates(recipe, draft)
    const operationsPerSecond = getRecipeOperationsPerSecond(recipe, draft)
    const powerEstimate = getPlannerPowerEstimate(recipe, draft)
    const targetOutput = getPlannerTargetOutput(recipe, draft)
    const targetRatePerSecond = getPlannerDraftTargetRatePerSecond(draft)

    const targetOutputRates = targetOutput
        ? outputRates.filter(({ stack }) => stack === targetOutput)
        : []

    const byproductRates = targetOutput
        ? outputRates.filter(({ stack }) => stack !== targetOutput)
        : outputRates

    if (targetRatePerSecond === undefined) {
        return null
    }

    return (
        <section className="planner-rate-breakdown" aria-label="Planner direct rates">
            <div className="panel-heading">
                <h2>Direct recipe rates</h2>
                <p>
                    Scaled rates for the selected recipe only. Dependency solving comes later.
                </p>
                {operationsPerSecond !== undefined && (
                    <p className="planner-rate-note">
                        Recipe operations: {formatDecimal(operationsPerSecond)} / sec
                    </p>
                )}
                {powerEstimate && (
                    <div className="planner-power-summary">
                        <span>
                            Recipe draw: <strong>{formatNumber(powerEstimate.recipeEuPerTick)} EU/t</strong>
                        </span>
                        <span>
                            Average draw:{' '}
                            <strong>{formatDecimal(powerEstimate.exactEuPerTick)} EU/t</strong>
                        </span>
                        <span>
                            Installed draw:{' '}
                            <strong>{formatNumber(powerEstimate.roundedEuPerTick)} EU/t</strong>
                        </span>
                    </div>
                )}
            </div>

            <div className="planner-rate-columns">
                <div className="planner-rate-list">
                    <PlannerRateList
                        title="Inputs / sec"
                        recipe={recipe}
                        rates={inputRates}
                        actionLabel="Find producers"
                        onStackAction={onFindProducers}
                    />
                </div>

                <div className="planner-rate-list">
                    <PlannerRateList
                        title="Target output / sec"
                        recipe={recipe}
                        rates={targetOutputRates}
                        actionLabel="Find uses"
                        onStackAction={onFindUses}
                    />

                    {byproductRates.length > 0 && (
                        <PlannerRateList
                            title="Byproducts / sec"
                            recipe={recipe}
                            rates={byproductRates}
                            actionLabel="Find uses"
                            onStackAction={onFindUses}
                        />
                    )}
                </div>
            </div>
        </section>
    )
}

interface PlannerRateListProps {
    title: string
    recipe: NormalizedExportRecipe
    rates: PlannerStackRate[]
    actionLabel: string
    onStackAction: (stack: ExportStack) => void
}

function PlannerRateList({ title, recipe, rates, actionLabel, onStackAction }: PlannerRateListProps) {
    return (
        <div className="planner-rate-section">
            <h3>{title}</h3>

            {rates.length > 0 ? (
                <ul>
                    {rates.map(({ stack, ratePerSecond }, index) => (
                        <li key={`${stack.kind}:${stack.id}:${stack.meta}:${index}`}>
                            <div>
                                <strong>{stack.displayName}</strong>
                                <span>{formatStackIdentity(stack)}</span>
                            </div>
                            <div className="planner-rate-values">
                                <em>
                                    {formatDecimal(ratePerSecond)} {stack.unit}/s total
                                </em>

                                {getPerMachineStackRate(stack, recipe) !== undefined && (
                                    <span>
                                        {formatDecimal(getPerMachineStackRate(stack, recipe)!)}{' '}
                                        {stack.unit}/s per machine
                                    </span>
                                )}

                                <button
                                    className="stack-action-button"
                                    type="button"
                                    onClick={() => onStackAction(stack)}
                                >
                                    {actionLabel}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="muted-text">None</p>
            )}
        </div>
    )
}