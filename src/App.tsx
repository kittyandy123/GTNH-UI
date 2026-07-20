import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { loadRecipeExport } from './lib/loadRecipes'
import {
  formatDate,
  formatNumber,
  formatExactStackSearchToken,
  normalizeSearchText,
  recipeMatchesQuery,
} from './lib/recipeHelpers'
import { normalizeExportDocument } from './lib/normalizeExport'
import type { SearchMode } from './lib/recipeHelpers'
import type { ExportStack } from './types/recipe'
import type { NormalizedExportDocument } from './lib/normalizeExport'
import type { ResultViewMode } from './types/recipeBrowser'
import { RecipeDetails } from './components/RecipeDetails'
import { DiagnosticsGrid } from './components/DiagnosticsGrid'
import { MachineSidebar } from './components/MachineSidebar'
import { RecipeResults } from './components/RecipeResults'
import { buildOutputGroups } from './lib/outputGroups'
import {
  createPlannerDraft,
    getPlannerDraftRecipeId,
    setPlannerDraftConstraintSolveMode,
    setPlannerDraftFixedMachineCount,
    setPlannerDraftMachineCountMode,
    setPlannerDraftStackConstraintRate,
    setPlannerDraftTargetOutputIndex,
    type PlannerDraft,
} from './planner/model/plannerDraft'
import { PlannerNavigationNotice, type PlannerNavigationPurpose } from './components/PlannerNavigationNotice'
import { PlannerGraphPreview } from './components/PlannerGraphPreview'
import {
  buildRecipeCatalog,
  type RecipeCatalog,
} from './catalog/recipeCatalog'
import {
  getConsumerRecipesForStack,
  getProducerRecipesForStack,
} from './catalog/recipeCatalogQueries'

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
  | {
        status: 'loaded'
        data: NormalizedExportDocument
        catalog: RecipeCatalog
    }
  | { status: 'error'; message: string }

type StackNavigationMode =
  Extract<SearchMode, 'inputs' | 'outputs'>

interface StackNavigationQuery {
  stack: ExportStack
  mode: StackNavigationMode
}

interface PlannerNavigationContext {
  stack: ExportStack
  purpose: PlannerNavigationPurpose
}

function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [searchText, setSearchText] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('all')
  const [resultViewMode, setResultViewMode] = useState<ResultViewMode>('exact')
  const [selectedOutputGroupKey, setSelectedOutputGroupKey] = useState<string | undefined>()
  const [selectedMachineId, setSelectedMachineId] = useState<string | undefined>()
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | undefined>()
  const [stackNavigationQuery, setStackNavigationQuery] = useState<StackNavigationQuery>()
  const [plannerDraft, setPlannerDraft] = useState<PlannerDraft | undefined>()
  const [plannerNavigationContext, setPlannerNavigationContext] = useState<PlannerNavigationContext | undefined>()

  const plannedRecipeId = plannerDraft
      ? getPlannerDraftRecipeId(plannerDraft)
      : undefined

  useEffect(() => {
    let cancelled = false

    async function loadRecipes() {
      try {
        const rawData = await loadRecipeExport()
        const data = normalizeExportDocument(rawData)
        const catalog = buildRecipeCatalog(data)

        if (!cancelled) {
          setLoadState({
            status: 'loaded',
            data,
            catalog,
          })
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

  const exportDocument =
      loadState.status === 'loaded'
          ? loadState.data
          : undefined

  const recipeCatalog =
      loadState.status === 'loaded'
          ? loadState.catalog
          : undefined

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

    if (recipeCatalog && stackNavigationQuery) {
      const indexedRecipes =
          stackNavigationQuery.mode === 'outputs'
              ? getProducerRecipesForStack(
                  recipeCatalog,
                  stackNavigationQuery.stack,
              )
              : getConsumerRecipesForStack(
                  recipeCatalog,
                  stackNavigationQuery.stack,
              )

      return [...indexedRecipes]
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
  }, [
    exportDocument,
    recipeCatalog,
    stackNavigationQuery,
    searchText,
    searchMode,
    selectedMachineId
  ])

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

  const selectedRecipe = selectedRecipeId
      ? recipeCatalog?.recipesById.get(selectedRecipeId)
      : undefined

  const plannedRecipe = plannedRecipeId
      ? recipeCatalog?.recipesById.get(plannedRecipeId)
      : undefined

  function selectMachine(machineId: string | undefined) {
    setSelectedMachineId(machineId)
    setSelectedRecipeId(undefined)
    setSelectedOutputGroupKey(undefined)
    setStackNavigationQuery(undefined)
    setPlannerNavigationContext(undefined)
  }

  function navigateToStack(stack: ExportStack, mode: StackNavigationMode, plannerContext?: PlannerNavigationContext) {
    setSearchText(formatExactStackSearchToken(stack))
    setSearchMode(mode)
    setResultViewMode('exact')
    setSelectedMachineId(undefined)
    setSelectedRecipeId(undefined)
    setSelectedOutputGroupKey(undefined)

    setStackNavigationQuery({
      stack,
      mode,
    })

    setPlannerNavigationContext(plannerContext)
  }

  function focusRecipe(recipeId: string) {
    setSearchText(recipeId)
    setSearchMode('ids')
    setResultViewMode('exact')
    setSelectedMachineId(undefined)
    setSelectedRecipeId(recipeId)
    setSelectedOutputGroupKey(undefined)
    setStackNavigationQuery(undefined)
    setPlannerNavigationContext(undefined)
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
              setStackNavigationQuery(undefined)
              setPlannerNavigationContext(undefined)
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
                    setStackNavigationQuery(undefined)
                    setPlannerNavigationContext(undefined)
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
                      setPlannerNavigationContext(undefined)
                    }}
                >
                  {option.label}
                </button>
            ))}
          </div>
        </section>

        {plannerNavigationContext && plannedRecipe && (
            <PlannerNavigationNotice
              stack={plannerNavigationContext.stack}
              purpose={plannerNavigationContext.purpose}
              onSelectPlannedRecipe={() => focusRecipe(plannedRecipe.id)}
              onClear={() => setPlannerNavigationContext(undefined)}
            />
        )}

        {plannedRecipe && plannerDraft && (
            <PlannerGraphPreview
                recipe={plannedRecipe}
                draft={plannerDraft}
                onSelectRecipe={() => focusRecipe(plannedRecipe.id)}
                onClearPlan={() => setPlannerDraft(undefined)}
                onMachineCountModeChange={(machineCountMode) =>
                    setPlannerDraft((currentDraft) =>
                        currentDraft
                            ? setPlannerDraftMachineCountMode(currentDraft, machineCountMode)
                            : undefined,
                    )
                }
                onFixedMachineCountChange={(fixedMachineCount) =>
                    setPlannerDraft((currentDraft) =>
                        currentDraft
                            ? setPlannerDraftFixedMachineCount(currentDraft, fixedMachineCount)
                            : undefined,
                    )
                }
                onConstraintSolveModeChange={(solveMode) =>
                    setPlannerDraft((currentDraft) =>
                        currentDraft
                            ? setPlannerDraftConstraintSolveMode(currentDraft, solveMode)
                            : undefined,
                    )
                }
                onStackConstraintRateChange={(stackKey, role, ratePerSecond) =>
                    setPlannerDraft((currentDraft) =>
                        currentDraft
                            ? setPlannerDraftStackConstraintRate(
                                currentDraft,
                                stackKey,
                                role,
                                ratePerSecond,
                            )
                            : undefined,
                    )
                }
                onTargetOutputIndexChange={(targetOutputIndex) =>
                    setPlannerDraft((currentDraft) =>
                        currentDraft
                            ? setPlannerDraftTargetOutputIndex(currentDraft, targetOutputIndex, plannedRecipe)
                            : undefined,
                    )
                }
                onFindProducers={(stack) =>
                    navigateToStack(stack, 'outputs', {
                        stack,
                        purpose: 'producers',
                    })
                }
                onFindUses={(stack) =>
                    navigateToStack(stack, 'inputs', {
                        stack,
                        purpose: 'uses',
                    })
                }
            />
        )}

        <section className="planner-layout">
          <MachineSidebar
            machineCounts={machineCounts}
            selectedMachineId={selectedMachineId}
            loaded={loadState.status === 'loaded'}
            onSelectMachine={selectMachine}
          />

          <RecipeResults
            loaded={loadState.status === 'loaded'}
            filteredRecipes={filteredRecipes}
            visibleRecipes={visibleRecipes}
            outputGroups={outputGroups}
            visibleOutputGroups={visibleOutputGroups}
            selectedOutputGroup={selectedOutputGroup}
            visibleOutputGroupRecipes={visibleOutputGroupRecipes}
            selectedRecipeId={selectedRecipeId}
            resultViewMode={resultViewMode}
            onSelectRecipe={(recipeId) => setSelectedRecipeId(recipeId)}
            onSelectOutputGroup={(group) => {
              setSelectedOutputGroupKey(group.key)

              const firstRecipe = group.recipes[0]

              if (firstRecipe) {
                setSelectedRecipeId(firstRecipe.id)
              }
            }}
            onClearOutputGroup={() => {
              setSelectedOutputGroupKey(undefined)
              setSelectedRecipeId(undefined)
            }}
          />

          <aside className="recipe-details" aria-label="Selected recipe details">
            <div className="panel-heading">
              <h2>Details</h2>
              <p>Select a recipe to inspect inputs, outputs, duration, EU/t, and metadata.</p>
            </div>

            {selectedRecipe ? (
                <RecipeDetails
                    recipe={selectedRecipe}
                    isPlanned={plannedRecipeId === selectedRecipe.id}
                    onPlanRecipe={() => {
                      if (selectedRecipe.planning?.supported === false) {
                        return
                      }

                      setPlannerDraft(createPlannerDraft(selectedRecipe))
                    }}
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