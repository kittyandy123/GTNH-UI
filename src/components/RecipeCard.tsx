import { formatRecipeStats } from '../lib/recipeHelpers'
import type { NormalizedExportRecipe } from '../lib/normalizeExport'
import { StackLine } from './StackLine'

interface RecipeCardProps {
    recipe: NormalizedExportRecipe
    active: boolean
    onSelect: () => void
}

export function RecipeCard({ recipe, active, onSelect }: RecipeCardProps) {
    return (
        <button
            className={active ? 'recipe-card active' : 'recipe-card'}
            type="button"
            onClick={onSelect}
        >
            <div className="recipe-card-header">
                <strong>{recipe.machine.name}</strong>
                <span>{formatRecipeStats(recipe)}</span>
            </div>

            <StackLine label="In" stacks={recipe.inputs} />

            {recipe.tools.length > 0 && <StackLine label="Tool" stacks={recipe.tools} />}

            <StackLine label="Out" stacks={recipe.outputs} />
        </button>
    )
}