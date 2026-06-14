import { formatDecimal, formatRecipeStats, formatStackCompact } from '../lib/recipeHelpers'
import type { NormalizedExportRecipe } from '../lib/normalizeExport'
import type { PlannerDraft } from '../planner/model/plannerDraft'
import { getBaseOutputRatePerSecond, getPlannerTargetOutput, getRequiredMachineCount } from '../planner/calc/rates'

interface PlannerSummaryProps {
    recipe: NormalizedExportRecipe
    draft: PlannerDraft
    onSelectRecipe: () => void
    onClearPlan: () => void
    onTargetRateChange: (targetRatePerSecond: number | undefined) => void
}

export function PlannerSummary({ recipe, draft, onSelectRecipe, onClearPlan, onTargetRateChange }: PlannerSummaryProps) {
    const targetOutput = getPlannerTargetOutput(recipe, draft)
    const baseRate = getBaseOutputRatePerSecond(recipe, draft)
    const requiredMachines = getRequiredMachineCount(recipe, draft)

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
                        Estimated machines: {formatDecimal(requiredMachines)}
                    </p>
                )}
            </div>

            <div className="planner-summary-actions">
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