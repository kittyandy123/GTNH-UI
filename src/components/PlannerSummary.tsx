import { formatDecimal, formatRecipeStats, formatStackCompact } from '../lib/recipeHelpers'
import type { NormalizedExportRecipe } from '../lib/normalizeExport'
import type { PlannerDraft } from '../planner/model/plannerDraft'
import { computePlannerDraftSummary } from '../planner/calc/planSummary'

interface PlannerSummaryProps {
    recipe: NormalizedExportRecipe
    draft: PlannerDraft
    onSelectRecipe: () => void
    onClearPlan: () => void
    onTargetRateChange: (targetRatePerSecond: number | undefined) => void
    onTargetOutputIndexChange: (targetOutputIndex: number) => void
}

export function PlannerSummary({ recipe, draft, onSelectRecipe, onClearPlan, onTargetRateChange, onTargetOutputIndexChange }: PlannerSummaryProps) {
    const summary = computePlannerDraftSummary(recipe, draft)

    return (
        <section className="planner-summary" aria-label="Planner draft">
            <div>
                <p className="eyebrow">Planner Draft</p>
                <h2>{getRecipeTargetLabel(recipe)}</h2>
                <p>
                    {recipe.machine.name} · {formatRecipeStats(recipe)}
                </p>

                {summary.targetOutput && (
                    <p className="planner-rate-note">
                        Target output: {formatStackCompact(summary.targetOutput)}
                        {summary.baseTargetRatePerSecond !== undefined && (
                            <>
                                {' '}
                                · Base rate: {formatDecimal(summary.baseTargetRatePerSecond)}{' '}
                                {summary.targetOutput.unit}/s
                            </>
                        )}
                    </p>
                )}

                {summary.exactMachineCount !== undefined && (
                    <p className="planner-rate-note">
                        Estimated machines: {formatDecimal(summary.exactMachineCount)} exact
                        {summary.roundedMachineCount !== undefined && (
                            <> · build {summary.roundedMachineCount}</>
                        )}
                    </p>
                )}
            </div>

            <div className="planner-summary-actions">
                {recipe.outputs.length > 1 && (
                    <label className="target-output-field">
                        <span>Target output</span>
                        <select
                            value={summary.targetOutputIndex}
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
                        value={summary.targetRatePerSecond ?? ''}
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