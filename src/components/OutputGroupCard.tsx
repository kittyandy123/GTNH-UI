import { formatMachineSummary, formatNumber } from '../lib/recipeHelpers'
import type { OutputRecipeGroup } from '../types/recipeBrowser'
import { StackLine } from './StackLine'

interface OutputGroupCardProps {
    group: OutputRecipeGroup
    active: boolean
    onSelect: () => void
}

export function OutputGroupCard({ group, active, onSelect }: OutputGroupCardProps) {
    return (
        <button
            className={active ? 'recipe-card active' : 'recipe-card'}
            type="button"
            onClick={onSelect}
        >
            <div className="recipe-card-header">
                <strong>{group.output.displayName}</strong>
                <span>{formatNumber(group.recipes.length)} recipes</span>
            </div>

            <StackLine label="Out" stacks={[group.output]} />

            <div className="stack-line">
                <span className="stack-line-label">Via</span>
                <span className="stack-line-value">
                    {formatMachineSummary(group.recipes)}
                </span>
            </div>
        </button>
    )
}