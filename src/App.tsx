import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { loadRecipeExport } from './lib/loadRecipes'
import {
  formatDate,
  formatNumber,
  formatStackSearchToken,
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
import { PlannerSummary } from './components/PlannerSummary'
import { createPlannerDraft, type PlannerDraft } from './planner/model/plannerDraft'

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
  const [plannerDraft, setPlannerDraft] = useState<PlannerDraft | undefined>()

  const plannedRecipeId = plannerDraft?.recipeId

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

  const plannedRecipe = useMemo(() => {
    if (!exportDocument || !plannedRecipeId) {
      return undefined
    }

    return exportDocument.recipes.find((recipe) => recipe.id === plannedRecipeId)
  }, [exportDocument, plannedRecipeId])

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

        {plannedRecipe && plannerDraft && (
            <PlannerSummary
              recipe={plannedRecipe}
              draft={plannerDraft}
              onSelectRecipe={() => setSelectedRecipeId(plannedRecipe.id)}
              onClearPlan={() => setPlannerDraft(undefined)}
              onTargetRateChange={(targetRatePerSecond) =>
                setPlannerDraft((currentDraft) =>
                  currentDraft
                    ? {
                        ...currentDraft,
                        targetRatePerSecond,
                      }
                    : undefined,
                )
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
                    onPlanRecipe={() => setPlannerDraft(createPlannerDraft(selectedRecipe))}
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