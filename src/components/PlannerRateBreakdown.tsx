import { formatDecimal, formatStackIdentity } from '../lib/recipeHelpers'
import type { NormalizedExportRecipe } from '../lib/normalizeExport'
import type { PlannerDraft } from '../planner/model/plannerDraft'
import { getPerMachineStackRate, getPlannedInputRates, getPlannedOutputRates, getRecipeOperationsPerSecond, type PlannerStackRate } from '../planner/calc/rates'

interface PlannerRateBreakdownProps {
    recipe: NormalizedExportRecipe
    draft: PlannerDraft
}

export function PlannerRateBreakdown({ recipe, draft }: PlannerRateBreakdownProps) {
    const inputRates = getPlannedInputRates(recipe, draft)
    const outputRates = getPlannedOutputRates(recipe, draft)
    const operationsPerSecond = getRecipeOperationsPerSecond(recipe, draft)

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
                {operationsPerSecond !== undefined && (
                    <p className="planner-rate-note">
                        Recipe operations: {formatDecimal(operationsPerSecond)} / sec
                    </p>
                )}
            </div>

            <div className="planner-rate-columns">
                <PlannerRateList title="Inputs / sec" recipe={recipe} rates={inputRates} />
                <PlannerRateList title="Outputs / sec" recipe={recipe} rates={outputRates} />
            </div>
        </section>
    )
}

interface PlannerRateListProps {
    title: string
    recipe: NormalizedExportRecipe
    rates: PlannerStackRate[]
}

function PlannerRateList({ title, recipe, rates }: PlannerRateListProps) {
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