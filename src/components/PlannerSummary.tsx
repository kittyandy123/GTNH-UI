import { formatDecimal, formatRecipeStats, formatStackCompact } from '../lib/recipeHelpers'
import type { NormalizedExportRecipe } from '../lib/normalizeExport'
import type { PlannerDraft } from '../planner/model/plannerDraft'
import { getBaseOutputRatePerSecond, getPlannerTargetOutput, getRequiredMachineCount, getRoundedRequiredMachineCount } from '../planner/calc/rates'

interface PlannerSummaryProps {
    recipe: NormalizedExportRecipe
    draft: PlannerDraft
    onSelectRecipe: () => void
    onClearPlan: () => void
    onTargetRateChange: (targetRatePerSecond: number | undefined) => void
    onTargetOutputIndexChange: (targetOutputIndex: number) => void
}

export function PlannerSummary({ recipe, draft, onSelectRecipe, onClearPlan, onTargetRateChange, onTargetOutputIndexChange }: PlannerSummaryProps) {
    const targetOutput = getPlannerTargetOutput(recipe, draft)
    const baseRate = getBaseOutputRatePerSecond(recipe, draft)
    const requiredMachines = getRequiredMachineCount(recipe, draft)
    const roundedRequiredMachines = getRoundedRequiredMachineCount(recipe, draft)

    return (
        <section className="planner-summary" aria-label="Planner draft">
            <div>
                <p className="eyebrow">Planner Draft</p>
                <h2>{getRecipeTargetLabel(recipe)}</h2>
                <p>
                    {recipe.machine.name} · {formatRecipeStats(recipe)}
                </p>

                {targetOutput && (
                    <p className="planner-rate-note">
                        Target output: {formatStackCompact(targetOutput)}
                        {baseRate !== undefined && (
                            <> · Base rate: {formatDecimal(baseRate)} {targetOutput.unit}/s</>
                        )}
                    </p>
                )}

                {requiredMachines !== undefined && (
                    <p className="planner-rate-note">
                        Estimated machines: {formatDecimal(requiredMachines)} exact
                        {roundedRequiredMachines !== undefined && (
                            <> · build {roundedRequiredMachines}</>
                        )}
                    </p>
                )}
            </div>

            <div className="planner-summary-actions">
                {recipe.outputs.length > 1 && (
                    <label className="target-output-field">
                        <span>Target output</span>
                        <select
                            value={draft.targetOutputIndex}
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

                <label className="target-rate-field">
                    <span>Target / sec</span>
                    <input
                        min="0"
                        step="0.001"
                        type="number"
                        value={draft.targetRatePerSecond ?? ''}
                        onChange={(event) => {
                            const rawValue = event.target.value.trim()

                            if (rawValue === '') {
                                onTargetRateChange(undefined)
                                return
                            }

                            const parsedValue = Number(rawValue)

                            onTargetRateChange(
                                Number.isFinite(parsedValue) && parsedValue > 0
                                  ? parsedValue
                                  : undefined,
                            )
                        }}
                    />

                    <div className="target-rate-presets">
                        {[1, 5, 10].map((rate) => (
                            <button
                              key={rate}
                              type="button"
                              onClick={() => onTargetRateChange(rate)}
                            >
                                {rate}/s
                            </button>
                        ))}

                        <button type="button" onClick={() => onTargetRateChange(undefined)}>
                            Clear
                        </button>
                    </div>
                </label>

                <button className="secondary-action-button" type="button" onClick={onSelectRecipe}>
                    View recipe
                </button>
                <button className="secondary-action-button" type="button" onClick={onClearPlan}>
                    Clear plan
                </button>
            </div>
        </section>
    )
}

function getRecipeTargetLabel(recipe: NormalizedExportRecipe): string {
    if (recipe.outputs.length === 0) {
        return recipe.machine.name
    }

    return recipe.outputs.map(formatStackCompact).join(', ')
}