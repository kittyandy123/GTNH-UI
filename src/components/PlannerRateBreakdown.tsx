import { formatDecimal, formatStackIdentity } from '../lib/recipeHelpers'
import type { NormalizedExportRecipe } from '../lib/normalizeExport'
import type { PlannerDraft } from '../planner/model/plannerDraft'
import { getPlannedInputRates, getPlannedOutputRates, type PlannerStackRate } from '../planner/calc/rates'

interface PlannerRateBreakdownProps {
    recipe: NormalizedExportRecipe
    draft: PlannerDraft
}

export function PlannerRateBreakdown({ recipe, draft }: PlannerRateBreakdownProps) {
    const inputRates = getPlannedInputRates(recipe, draft)
    const outputRates = getPlannedOutputRates(recipe, draft)

    if (draft.targetRatePerSecond === undefined) {
        return null
    }

    return (
        <section className="planner-rate-breakdown" aria-label="Planner direct rates">
            <div className="panel-heading">
                <h2>Direct recipe rates</h2>
                <p>
                    Scaled rates for the selected recipe only. Dependency solving comes later.
                </p>
            </div>

            <div className="planner-rate-columns">
                <PlannerRateList title="Inputs / sec" rates={inputRates} />
                <PlannerRateList title="Outputs / sec" rates={outputRates} />
            </div>
        </section>
    )
}

interface PlannerRateListProps {
    title: string
    rates: PlannerStackRate[]
}

function PlannerRateList({ title, rates }: PlannerRateListProps) {
    return (
        <div className="planner-rate-list">
            <h3>{title}</h3>

            {rates.length > 0 ? (
                <ul>
                    {rates.map(({ stack, ratePerSecond }, index) => (
                        <li key={`${stack.kind}:${stack.id}:${stack.meta}:${index}`}>
                            <div>
                                <strong>{stack.displayName}</strong>
                                <span>{formatStackIdentity(stack)}</span>
                            </div>
                            <em>
                                {formatDecimal(ratePerSecond)} {stack.unit}/s
                            </em>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="muted-text">None</p>
            )}
        </div>
    )
}