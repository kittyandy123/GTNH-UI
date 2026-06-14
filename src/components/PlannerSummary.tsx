import { formatRecipeStats, formatStackCompact } from '../lib/recipeHelpers'
import type { NormalizedExportRecipe } from '../lib/normalizeExport'

interface PlannerSummaryProps {
    recipe: NormalizedExportRecipe
    onSelectRecipe: () => void
    onClearPlan: () => void
}

export function PlannerSummary({ recipe, onSelectRecipe, onClearPlan }: PlannerSummaryProps) {
    return (
        <section className="planner-summary" aria-label="Planner draft">
            <div>
                <p className="eyebrow">Planner draft</p>
                <h2>{getRecipeTargetLabel(recipe)}</h2>
                <p>
                    {recipe.machine.name} · {formatRecipeStats(recipe)}
                </p>
            </div>

            <div className="planner-summary-actions">
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