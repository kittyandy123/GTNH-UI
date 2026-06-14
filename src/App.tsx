import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { loadRecipeExport } from './lib/loadRecipes'
import {
  formatDate,
  formatNumber,
  formatStackIdentity,
  formatStackSearchToken,
  normalizeSearchText,
  recipeMatchesQuery,
} from './lib/recipeHelpers'
import { normalizeExportDocument } from './lib/normalizeExport'
import type { SearchMode } from './lib/recipeHelpers'
import type { ExportStack } from './types/recipe'
import type { NormalizedExportDocument, NormalizedExportRecipe } from './lib/normalizeExport'
import { OutputGroupCard } from './components/OutputGroupCard'
import { RecipeCard } from './components/RecipeCard'
import type { OutputRecipeGroup, ResultViewMode } from './types/recipeBrowser'
import { RecipeDetails } from './components/RecipeDetails'
import { DiagnosticsGrid } from './components/DiagnosticsGrid'
import { MachineSidebar } from './components/MachineSidebar'

const MAX_VISIBLE_RECIPES = 200

const SEARCH_MODE_OPTIONS: { value: SearchMode; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'inputs', label: 'Inputs' },
  { value: 'outputs', label: 'Outputs' },
  { value: 'machines', label: 'Machines' },
  { value: 'ids', label: 'IDs' },
]

const RESULT_VIEW_OPTIONS: { value: ResultViewMode; label: string }[] = [
  { value: 'exact', label: 'Exact recipes' },
  { value: 'output-index', label: 'Output index' },
]

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; data: NormalizedExportDocument }
  | { status: 'error'; message: string }

function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [searchText, setSearchText] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('all')
  const [resultViewMode, setResultViewMode] = useState<ResultViewMode>('exact')
  const [selectedOutputGroupKey, setSelectedOutputGroupKey] = useState<string | undefined>()
  const [selectedMachineId, setSelectedMachineId] = useState<string | undefined>()
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | undefined>()

  useEffect(() => {
    let cancelled = false

    async function loadRecipes() {
      try {
        const rawData = await loadRecipeExport()
        const data = normalizeExportDocument(rawData)

        if (!cancelled) {
          setLoadState({ status: 'loaded', data })
        }
      } catch (error) {
        if (!cancelled) {
          setLoadState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to load recipe export',
          })
        }
      }
    }

    void loadRecipes()

    return () => {
      cancelled = true
    }
  }, [])

  const exportDocument = loadState.status === 'loaded' ? loadState.data : undefined

  const machineCounts = useMemo(() => {
    if (!exportDocument) {
      return []
    }

    return Object.entries(exportDocument.diagnostics.recipeCountsByMachine)
        .map(([machineId, count]) => ({ machineId, count }))
        .sort((a, b) => b.count - a.count)
  }, [exportDocument])

  const filteredRecipes = useMemo(() => {
    if (!exportDocument) {
      return []
    }

    const query = normalizeSearchText(searchText)

    return exportDocument.recipes.filter((recipe) => {
      if (selectedMachineId && recipe.machine.id !== selectedMachineId) {
        return false
      }

      if (!query) {
        return true
      }

      return recipeMatchesQuery(recipe, query, searchMode)
    })
  }, [exportDocument, searchText, searchMode, selectedMachineId])

  const visibleRecipes = filteredRecipes.slice(0, MAX_VISIBLE_RECIPES)

  const outputGroups = useMemo(
      () => buildOutputGroups(filteredRecipes, searchText),
      [filteredRecipes, searchText],
  )

  const selectedOutputGroup = useMemo(() => {
    if (!selectedOutputGroupKey) {
      return undefined
    }

    return outputGroups.find((group) => group.key === selectedOutputGroupKey)
  }, [outputGroups, selectedOutputGroupKey])

  const visibleOutputGroups = outputGroups.slice(0, MAX_VISIBLE_RECIPES)

  const visibleOutputGroupRecipes = selectedOutputGroup?.recipes.slice(0, MAX_VISIBLE_RECIPES) ?? []

  const selectedRecipe = useMemo(() => {
    if (!exportDocument || !selectedRecipeId) {
      return undefined
    }

    return exportDocument.recipes.find((recipe) => recipe.id === selectedRecipeId)
  }, [exportDocument, selectedRecipeId])

  function selectMachine(machineId: string | undefined) {
    setSelectedMachineId(machineId)
    setSelectedRecipeId(undefined)
    setSelectedOutputGroupKey(undefined)
  }

  function navigateToStack(stack: ExportStack, mode: SearchMode) {
    setSearchText(formatStackSearchToken(stack))
    setSearchMode(mode)
    setResultViewMode('exact')
    setSelectedMachineId(undefined)
    setSelectedRecipeId(undefined)
    setSelectedOutputGroupKey(undefined)
  }

  return (
      <main className="app-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">GT New Horizons</p>
            <h1>Recipe Planner</h1>
          </div>

          <section className="export-summary" aria-label="Loaded export summary">
            <span className="status-pill">{getStatusText(loadState)}</span>
            <span>{getExportSubtitle(loadState)}</span>
          </section>
        </header>

        {loadState.status === 'loaded' && (
            <DiagnosticsGrid diagnostics={loadState.data.diagnostics} />
        )}

        {loadState.status === 'error' && (
            <section className="error-banner" role="alert">
              <strong>Could not load recipe export.</strong>
              <span>{loadState.message}</span>
            </section>
        )}

        <section className="search-panel" aria-label="Recipe search">
          <label className="search-label" htmlFor="recipe-search">
            Search recipes
          </label>
          <input
            id="recipe-search"
            className="search-input"
            type="search"
            placeholder="Search by item, fluid, machine, or recipe ID..."
            value={searchText}
            disabled={loadState.status !== 'loaded'}
            onChange={(event) => {
              setSearchText(event.target.value)
              setSelectedRecipeId(undefined)
              setSelectedOutputGroupKey(undefined)
            }}
          />

          <div className="search-mode-row" aria-label="Search scope">
            {SEARCH_MODE_OPTIONS.map((option) => (
                <button
                  className={
                    searchMode === option.value
                      ? 'search-mode-button active'
                      : 'search-mode-button'
                  }
                  key={option.value}
                  type="button"
                  disabled={loadState.status !== 'loaded'}
                  onClick={() => {
                    setSearchMode(option.value)
                    setSelectedRecipeId(undefined)
                    setSelectedOutputGroupKey(undefined)
                  }}
                >
                  {option.label}
                </button>
            ))}
          </div>

          <div className="search-mode-row" aria-label="Result view">
            {RESULT_VIEW_OPTIONS.map((option) => (
                <button
                    className={
                      resultViewMode === option.value
                          ? 'search-mode-button active'
                          : 'search-mode-button'
                    }
                    key={option.value}
                    type="button"
                    disabled={loadState.status !== 'loaded'}
                    onClick={() => {
                      setResultViewMode(option.value)
                      setSelectedRecipeId(undefined)
                      setSelectedOutputGroupKey(undefined)
                    }}
                >
                  {option.label}
                </button>
            ))}
          </div>
        </section>

        <section className="planner-layout">
          <MachineSidebar
            machineCounts={machineCounts}
            selectedMachineId={selectedMachineId}
            loaded={loadState.status === 'loaded'}
            onSelectMachine={selectMachine}
          />

          <section className="recipe-results" aria-label="Recipe results">
            <div className="panel-heading">
              <h2>Recipes</h2>
              <p>
                {getRecipeResultSummary(
                    loadState,
                    filteredRecipes.length,
                    outputGroups.length,
                    resultViewMode,
                    selectedOutputGroup,
                )}
              </p>
            </div>

            {loadState.status === 'loaded' ? (
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
                                onSelect={() => setSelectedRecipeId(recipe.id)}
                            />
                        ))}

                        {filteredRecipes.length > MAX_VISIBLE_RECIPES && (
                            <div className="recipe-limit-note">
                              Showing first {formatNumber(MAX_VISIBLE_RECIPES)} of{' '}
                              {formatNumber(filteredRecipes.length)} matches. Refine your search to
                              narrow the list.
                            </div>
                        )}
                      </>
                  ) : selectedOutputGroup ? (
                      <>
                        <div className="group-drilldown-header">
                          <button
                              className="group-back-button"
                              type="button"
                              onClick={() => {
                                setSelectedOutputGroupKey(undefined)
                                setSelectedRecipeId(undefined)
                              }}
                          >
                            ← Back to output index
                          </button>

                          <div className="group-drilldown-title">
                            <strong>{selectedOutputGroup.output.displayName}</strong>
                            <span>
                              {formatNumber(selectedOutputGroup.recipes.length)} exact recipes
                            </span>
                          </div>
                        </div>

                        {visibleOutputGroupRecipes.map((recipe) => (
                            <RecipeCard
                                active={selectedRecipeId === recipe.id}
                                key={recipe.id}
                                recipe={recipe}
                                onSelect={() => setSelectedRecipeId(recipe.id)}
                            />
                        ))}

                        {selectedOutputGroup.recipes.length > MAX_VISIBLE_RECIPES && (
                            <div className="recipe-limit-note">
                              Showing first {formatNumber(MAX_VISIBLE_RECIPES)} of{' '}
                              {formatNumber(selectedOutputGroup.recipes.length)} recipes producing{' '}
                              {selectedOutputGroup.output.displayName}. Refine your search to narrow
                              the list.
                            </div>
                        )}
                      </>
                  ) : (
                      <>
                        {visibleOutputGroups.map((group) => (
                            <OutputGroupCard
                                active={selectedOutputGroupKey === group.key}
                                group={group}
                                key={group.key}
                                onSelect={() => {
                                  setSelectedOutputGroupKey(group.key)
                                  setSelectedRecipeId(group.recipes[0]?.id)
                                }}
                            />
                        ))}

                        {outputGroups.length > MAX_VISIBLE_RECIPES && (
                            <div className="recipe-limit-note">
                              Showing first {formatNumber(MAX_VISIBLE_RECIPES)} of{' '}
                              {formatNumber(outputGroups.length)} output entries. Refine your search
                              to narrow the list.
                            </div>
                        )}
                      </>
                  )}
                </div>
            ) : (
                <div className="empty-state">
                  <h3>Ready for recipe data</h3>
                  <p>
                    Load the exported recipe file to search recipes and inspect details.
                  </p>
                </div>
            )}
          </section>

          <aside className="recipe-details" aria-label="Selected recipe details">
            <div className="panel-heading">
              <h2>Details</h2>
              <p>Select a recipe to inspect inputs, outputs, duration, EU/t, and metadata.</p>
            </div>

            {selectedRecipe ? (
                <RecipeDetails
                    recipe={selectedRecipe}
                    onFindProducers={(stack) => navigateToStack(stack, 'outputs')}
                    onFindUses={(stack) => navigateToStack(stack, 'inputs')}
                />
            ) : loadState.status === 'loaded' ? (
                <div className="export-detail-card">
                  <h3>{loadState.data.pack.name}</h3>
                  <dl>
                    <div>
                      <dt>Minecraft</dt>
                      <dd>{loadState.data.pack.minecraftVersion}</dd>
                    </div>
                    <div>
                      <dt>Exporter</dt>
                      <dd>{loadState.data.export.exporterVersion}</dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>{loadState.data.export.source}</dd>
                    </div>
                    <div>
                      <dt>Exported at</dt>
                      <dd>{formatDate(loadState.data.export.exportedAt)}</dd>
                    </div>
                  </dl>
                </div>
            ) : (
                <div className="empty-card">No recipe selected.</div>
            )}
          </aside>
        </section>
      </main>
  )
}

function buildOutputGroups(recipes: NormalizedExportRecipe[], searchText: string): OutputRecipeGroup[] {
  const query = normalizeSearchText(searchText)
  const groups = new Map<string, OutputRecipeGroup>()

  for (const recipe of recipes) {
    for (const output of recipe.outputs) {
      const key = getOutputStackKey(output)
      const existingGroup = groups.get(key)

      if (existingGroup) {
        existingGroup.recipes.push(recipe)
        continue
      }

      groups.set(key, {
        key,
        output,
        recipes: [recipe],
      })
    }
  }

  return Array.from(groups.values()).sort((left, right) =>
    compareOutputGroups(left, right, query),
  )
}

function getOutputStackKey(output: ExportStack): string {
  if (output.kind === 'fluid') {
    return `${output.kind}:${output.id}`
  }

  return `${output.kind}:${output.id}:${output.meta}`
}

function compareOutputGroups(left: OutputRecipeGroup, right: OutputRecipeGroup, query: string): number {
  const relevanceComparison = getOutputGroupRelevance(right, query) - getOutputGroupRelevance(left, query)

  if (relevanceComparison !== 0) {
    return relevanceComparison
  }

  if (query) {
    const countComparison = right.recipes.length - left.recipes.length

    if (countComparison !== 0) {
      return countComparison
    }
  }

  const nameComparison = left.output.displayName.localeCompare(right.output.displayName)

  if (nameComparison !== 0) {
    return nameComparison
  }

  return right.recipes.length - left.recipes.length
}

function getOutputGroupRelevance(group: OutputRecipeGroup, query: string): number {
  if (!query) {
    return 0
  }

  const values = [
      group.output.displayName,
      group.output.id,
      formatStackIdentity(group.output),
  ].map((value) => value.toLowerCase())

  if (values.some((value) => value === query)) {
    return 4
  }

  if (values.some((value) => value.startsWith(query))) {
    return 3
  }

  if (values.some((value) => value.includes(query))) {
    return 2
  }

  return 0
}

function getRecipeResultSummary(loadState: LoadState, recipeCount: number, groupCount: number, resultViewMode: ResultViewMode, selectedOutputGroup: OutputRecipeGroup | undefined): string {
  if (loadState.status !== 'loaded') {
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

function getStatusText(loadState: LoadState): string {
  switch (loadState.status) {
    case 'loading':
      return 'Loading export'
    case 'loaded':
      return 'Export loaded'
    case 'error':
      return 'Export failed'
  }
}

function getExportSubtitle(loadState: LoadState): string {
  switch (loadState.status) {
    case 'loading':
      return 'Reading recipes.json'
    case 'loaded':
      return `${formatNumber(loadState.data.recipes.length)} recipes available`
    case 'error':
      return 'Recipe browser POC'
  }
}

export default App