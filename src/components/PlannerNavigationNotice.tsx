import { formatStackCompact, formatStackIdentity } from '../lib/recipeHelpers'
import type { ExportStack } from '../types/recipe'

export type PlannerNavigationPurpose = 'producers' | 'uses'

interface PlannerNavigationNoticeProps {
    stack: ExportStack
    purpose: PlannerNavigationPurpose
    onSelectPlannedRecipe: () => void
    onClear: () => void
}

export function PlannerNavigationNotice({ stack, purpose, onSelectPlannedRecipe, onClear }: PlannerNavigationNoticeProps) {
    return (
        <section className="planner-navigation-notice" aria-label="Planner search context">
            <div>
                <p className="eyebrow">Planner search</p>
                <h2>
                    Finding {purpose === 'producers' ? 'producers for' : 'uses of'}{' '}
                    {formatStackCompact(stack)}
                </h2>
                <p>{formatStackIdentity(stack)}</p>
            </div>

            <div className="planner-navigation-actions">
                <button className="secondary-action-button" type="button" onClick={onSelectPlannedRecipe}>
                    Show planned recipe
                </button>
                <button className="secondary-action-button" type="button" onClick={onClear}>
                    Dismiss
                </button>
            </div>
        </section>
    )
}