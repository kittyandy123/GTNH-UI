import { formatDecimal, formatNumber, formatStackIdentity } from '../lib/recipeHelpers'
import type { NormalizedExportRecipe } from '../lib/normalizeExport'
import type { PlannerDraft } from '../planner/model/plannerDraft'
import {
    computePlannerDraftSummary,
    type PlannerStackRate
} from '../planner/calc/planSummary'
import type { ExportStack } from '../types/recipe'

interface PlannerRateBreakdownProps {
    recipe: NormalizedExportRecipe
    draft: PlannerDraft
    onFindProducers: (stack: ExportStack) => void
    onFindUses: (stack: ExportStack) => void
}

export function PlannerRateBreakdown({ recipe, draft, onFindProducers, onFindUses }: PlannerRateBreakdownProps) {
    const summary = computePlannerDraftSummary(recipe, draft)

    if (summary.targetRatePerSecond === undefined) {
        return null
    }

    return (
        <section className="planner-rate-breakdown" aria-label="Planner direct rates">
            <div className="panel-heading">
                <h2>Direct recipe rates</h2>
                <p>
                    Scaled rates for the selected recipe only. Dependency solving comes later.
                </p>

                {summary.operationsPerSecond !== undefined && (
                    <p className="planner-rate-note">
                        Recipe operations: {formatDecimal(summary.operationsPerSecond)} / sec
                    </p>
                )}

                {summary.powerEstimate ? (
                    <div className="planner-power-summary">
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
                    </div>
                ) : (
                    <div className="planner-power-summary">
                        <span>
                            Power:{' '}
                            <strong>
                                {summary.usesEuPower ? 'Set a target rate to estimate EU/t' : 'Not EU-powered / fuel-based'}
                            </strong>
                        </span>
                    </div>
                )}
            </div>

            <div className="planner-rate-columns">
                <div className="planner-rate-list">
                    <PlannerRateList
                        title="Inputs / sec"
                        rates={summary.inputRates}
                        actionLabel="Find producers"
                        onStackAction={onFindProducers}
                    />
                </div>

                <div className="planner-rate-list">
                    <PlannerRateList
                        title="Target output / sec"
                        rates={summary.targetOutputRates}
                        actionLabel="Find uses"
                        onStackAction={onFindUses}
                    />

                    {summary.byproductRates.length > 0 && (
                        <PlannerRateList
                            title="Byproducts / sec"
                            rates={summary.byproductRates}
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
    rates: PlannerStackRate[]
    actionLabel: string
    onStackAction: (stack: ExportStack) => void
}

function PlannerRateList({ title, rates, actionLabel, onStackAction }: PlannerRateListProps) {
    return (
        <div className="planner-rate-section">
            <h3>{title}</h3>

            {rates.length > 0 ? (
                <ul>
                    {rates.map(({ stack, stackKey, ratePerSecond, perMachineRatePerSecond }, index) => (
                        <li key={`${stackKey}:${index}`}>
                            <div>
                                <strong>{stack.displayName}</strong>
                                <span>{formatStackIdentity(stack)}</span>
                            </div>
                            <div className="planner-rate-values">
                                <em>
                                    {formatDecimal(ratePerSecond)} {stack.unit}/s total
                                </em>

                                {perMachineRatePerSecond !== undefined && (
                                    <span>
                                        {formatDecimal(perMachineRatePerSecond)} {stack.unit}/s per machine
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