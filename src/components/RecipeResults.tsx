import { formatNumber } from '../lib/recipeHelpers'
import type { NormalizedExportRecipe } from '../lib/normalizeExport'
import type { OutputRecipeGroup, ResultViewMode } from '../types/recipeBrowser'
import { OutputGroupCard } from './OutputGroupCard'
import { RecipeCard } from './RecipeCard'

const MAX_VISIBLE_RECIPES = 200

interface RecipeResultsProps {
    loaded: boolean
    filteredRecipes: NormalizedExportRecipe[]
    visibleRecipes: NormalizedExportRecipe[]
    outputGroups: OutputRecipeGroup[]
    visibleOutputGroups: OutputRecipeGroup[]
    selectedOutputGroup: OutputRecipeGroup | undefined
    visibleOutputGroupRecipes: NormalizedExportRecipe[]
    selectedRecipeId: string | undefined
    resultViewMode: ResultViewMode
    onSelectRecipe: (recipeId: string) => void
    onSelectOutputGroup: (group: OutputRecipeGroup) => void
    onClearOutputGroup: () => void
}

export function RecipeResults({
    loaded,
    filteredRecipes,
    visibleRecipes,
    outputGroups,
    visibleOutputGroups,
    selectedOutputGroup,
    visibleOutputGroupRecipes,
    selectedRecipeId,
    resultViewMode,
    onSelectRecipe,
    onSelectOutputGroup,
    onClearOutputGroup,
}: RecipeResultsProps) {
    return (
        <section className="recipe-results" aria-label="Recipe results">
            <div className="panel-heading">
                <h2>Recipes</h2>
                <p>
                    {getRecipeResultSummary(
                        loaded,
                        filteredRecipes.length,
                        outputGroups.length,
                        resultViewMode,
                        selectedOutputGroup,
                    )}
                </p>
            </div>

            {loaded ? (
                <div className="recipe-list">
                    {filteredRecipes.length === 0 ? (
                        <div className="empty-state">
                            <h3>No matching recipes</h3>
                            <p>Try a different item, fluid, machine, or recipe ID.</p>
                        </div>
                    ) : resultViewMode === 'exact' ? (
                        <>
                            {visibleRecipes.map((recipe) => (
                                <RecipeCard
                                  active={selectedRecipeId === recipe.id}
                                  key={recipe.id}
                                  recipe={recipe}
                                  onSelect={() => onSelectRecipe(recipe.id)}
                                />
                            ))}

                            {filteredRecipes.length > MAX_VISIBLE_RECIPES && (
                                <div className="recipe-limit-note">
                                    Showing first {formatNumber(MAX_VISIBLE_RECIPES)} of{' '}
                                    {formatNumber(filteredRecipes.length)} matches. Refine your
                                    search to narrow the list.
                                </div>
                            )}
                        </>
                    ) : selectedOutputGroup ? (
                        <>
                            <div className="group-drilldown-header">
                                <button
                                    className="group-back-button"
                                    type="button"
                                    onClick={onClearOutputGroup}
                                >
                                    ← Back to output index
                                </button>

                                <div className="group-drilldown-title">
                                    <strong>{selectedOutputGroup.output.displayName}</strong>
                                    <span>
                                        {formatNumber(selectedOutputGroup.recipes.length)} exact
                                        recipes
                                    </span>
                                </div>
                            </div>

                            {visibleOutputGroupRecipes.map((recipe) => (
                                <RecipeCard
                                  active={selectedRecipeId === recipe.id}
                                  key={recipe.id}
                                  recipe={recipe}
                                  onSelect={() => onSelectRecipe(recipe.id)}
                                />
                            ))}

                            {selectedOutputGroup.recipes.length > MAX_VISIBLE_RECIPES && (
                                <div className="recipe-limit-note">
                                    Showing first {formatNumber(MAX_VISIBLE_RECIPES)} of{' '}
                                    {formatNumber(selectedOutputGroup.recipes.length)} recipes
                                    producing {selectedOutputGroup.output.displayName}. Refine
                                    your search to narrow the list.
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {visibleOutputGroups.map((group) => (
                                <OutputGroupCard
                                  active={false}
                                  group={group}
                                  key={group.key}
                                  onSelect={() => onSelectOutputGroup(group)}
                                />
                            ))}

                            {outputGroups.length > MAX_VISIBLE_RECIPES && (
                                <div className="recipe-limit-note">
                                    Showing first {formatNumber(MAX_VISIBLE_RECIPES)} of{' '}
                                    {formatNumber(outputGroups.length)} output entries. Refine
                                    your search to narrow the list.
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : (
                <div className="empty-state">
                    <h3>Ready for recipe data</h3>
                    <p>Load the exported recipe file to search recipes and inspect details.</p>
                </div>
            )}
        </section>
    )
}

function getRecipeResultSummary(
    loaded: boolean,
    recipeCount: number,
    groupCount: number,
    resultViewMode: ResultViewMode,
    selectedOutputGroup: OutputRecipeGroup | undefined,
): string {
    if (!loaded) {
        return 'Search results will appear here.'
    }

    if (resultViewMode === 'output-index') {
        if (selectedOutputGroup) {
            return `${formatNumber(selectedOutputGroup.recipes.length)} exact recipes producing ${selectedOutputGroup.output.displayName}.`
        }

        return `${formatNumber(groupCount)} output entries from ${formatNumber(recipeCount)} matching recipes.`
    }

    return `${formatNumber(recipeCount)} matching recipes.`
}