import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { loadRecipeExport } from './lib/loadRecipes'
import {
  formatDate,
  formatNumber,
  formatRecipeStats,
  formatStackAmount,
  formatStackCompact,
  formatStackIdentity,
  formatStackRate,
  formatStackSearchToken,
  normalizeSearchText,
  recipeMatchesQuery,
} from './lib/recipeHelpers'
import { normalizeExportDocument } from './lib/normalizeExport'
import type { SearchMode } from './lib/recipeHelpers'
import type { ExportStack } from './types/recipe'
import type { NormalizedExportDocument, NormalizedExportRecipe } from './lib/normalizeExport'

const MAX_VISIBLE_RECIPES = 200

const SEARCH_MODE_OPTIONS: { value: SearchMode; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'inputs', label: 'Inputs' },
  { value: 'outputs', label: 'Outputs' },
  { value: 'machines', label: 'Machines' },
  { value: 'ids', label: 'IDs' }
]

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; data: NormalizedExportDocument }
  | { status: 'error'; message: string }

function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [searchText, setSearchText] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('all')
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

  const selectedRecipe = useMemo(() => {
    if (!exportDocument || !selectedRecipeId) {
      return undefined
    }

    return exportDocument.recipes.find((recipe) => recipe.id === selectedRecipeId)
  }, [exportDocument, selectedRecipeId])

  function selectMachine(machineId: string | undefined) {
    setSelectedMachineId(machineId)
    setSelectedRecipeId(undefined)
  }

  function navigateToStack(stack: ExportStack, mode: SearchMode) {
    setSearchText(formatStackSearchToken(stack))
    setSearchMode(mode)
    setSelectedMachineId(undefined)
    setSelectedRecipeId(undefined)
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
            <section className="diagnostics-grid" aria-label="Export diagnostics">
              <MetricCard
                label="Total recipes"
                value={formatNumber(loadState.data.diagnostics.totalRecipes)}
              />
              <MetricCard
                label="Duplicate recipes skipped"
                value={formatNumber(loadState.data.diagnostics.duplicateRecipesSkipped)}
              />
              <MetricCard
                label="Display name fallbacks"
                value={formatNumber(loadState.data.diagnostics.displayNameFallbacks)}
              />
              <MetricCard
                label="Recipe errors"
                value={formatNumber(loadState.data.diagnostics.recipesSkippedDueToError)}
              />
              {loadState.data.diagnostics.toolInputsExtracted !== undefined && (
                  <MetricCard
                    label="Tool inputs extracted"
                    value={formatNumber(loadState.data.diagnostics.toolInputsExtracted)}
                  />
              )}
              {loadState.data.diagnostics.zeroAmountInputsRemaining !== undefined && (
                  <MetricCard
                    label="Zero-amount inputs remaining"
                    value={formatNumber(loadState.data.diagnostics.zeroAmountInputsRemaining)}
                  />
              )}
            </section>
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
                  }}
                >
                  {option.label}
                </button>
            ))}
          </div>
        </section>

        <section className="planner-layout">
          <aside className="machine-sidebar" aria-label="Machine filters">
            <div className="panel-heading">
              <h2>Machines</h2>
              <p>
                {loadState.status === 'loaded'
                  ? `${machineCounts.length} recipe maps loaded.`
                  : 'Recipe counts will appear here.'}
              </p>
            </div>

            {loadState.status === 'loaded' ? (
                <div className="machine-list">
                  <button
                    className={
                    selectedMachineId === undefined
                        ? 'machine-button active'
                        : 'machine-button'
                    }
                    type="button"
                    onClick={() => selectMachine(undefined)}
                  >
                    <span>All machines</span>
                    <strong>{formatNumber(loadState.data.recipes.length)}</strong>
                  </button>

                  {machineCounts.map((machine) => (
                      <button
                        className={
                        selectedMachineId === machine.machineId
                            ? 'machine-button active'
                            : 'machine-button'
                        }
                        key={machine.machineId}
                        type="button"
                        onClick={() => selectMachine(machine.machineId)}
                      >
                        <span>{machine.machineId}</span>
                        <strong>{formatNumber(machine.count)}</strong>
                      </button>
                  ))}
                </div>
            ) : (
                <div className="empty-card">
                  Load <code>recipes.json</code> to view machine filters.
                </div>
            )}
          </aside>

          <section className="recipe-results" aria-label="Recipe results">
            <div className="panel-heading">
              <h2>Recipes</h2>
              <p>{getRecipeResultSummary(loadState, filteredRecipes.length)}</p>
            </div>

            {loadState.status === 'loaded' ? (
                <div className="recipe-list">
                  {visibleRecipes.map((recipe) => (
                      <button
                        className={
                          selectedRecipeId === recipe.id
                            ? 'recipe-card active'
                              : 'recipe-card'
                        }
                        key={recipe.id}
                        type="button"
                        onClick={() => setSelectedRecipeId(recipe.id)}
                      >
                        <div className="recipe-card-header">
                          <strong>{recipe.machine.name}</strong>
                          <span>{formatRecipeStats(recipe)}</span>
                        </div>

                        <StackLine label="In" stacks={recipe.inputs} />

                        {recipe.tools.length > 0 && <StackLine label="Tool" stacks={recipe.tools} />}

                        <StackLine label="Out" stacks={recipe.outputs} />
                      </button>
                  ))}

                  {filteredRecipes.length > MAX_VISIBLE_RECIPES && (
                      <div className="recipe-limit-note">
                        Showing first {formatNumber(MAX_VISIBLE_RECIPES)} of{' '}
                        {formatNumber(filteredRecipes.length)} matches. Refine your
                        search to narrow the list.
                      </div>
                  )}

                  {filteredRecipes.length === 0 && (
                      <div className="empty-state">
                        <h3>No matching recipes</h3>
                        <p>Try a different item, fluid, machine, or recipe ID.</p>
                      </div>
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

interface MetricCardProps {
  label: string
  value: string
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
      <article className="metric-card">
        <span>{label}</span>
        <strong>{value}</strong>
      </article>
  )
}

interface StackLineProps {
  label: string
  stacks: ExportStack[]
}

function StackLine({ label, stacks }: StackLineProps) {
  return (
      <div className="stack-line">
        <span className="stack-line-label">{label}</span>
        <span className="stack-line-value">
          {stacks.length > 0
            ? stacks.map(formatStackCompact).join(', ')
            : 'None'}
        </span>
      </div>
  )
}

interface RecipeDetailsProps {
  recipe: NormalizedExportRecipe
  onFindProducers: (stack: ExportStack) => void
  onFindUses: (stack: ExportStack) => void
}

function RecipeDetails({ recipe, onFindProducers, onFindUses }: RecipeDetailsProps) {
  return (
      <article className="recipe-detail-card">
        <div className="recipe-detail-header">
          <h3>{recipe.machine.name}</h3>
          <span>{recipe.machine.id}</span>
        </div>

        <dl className="recipe-stat-grid">
          <div>
            <dt>Duration</dt>
            <dd>{recipe.durationSeconds}</dd>
          </div>
          <div>
            <dt>Ticks</dt>
            <dd>{recipe.durationTicks}</dd>
          </div>
          <div>
            <dt>EU/t</dt>
            <dd>{recipe.eut}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{recipe.machine.category}</dd>
          </div>
        </dl>

        <section className="detail-section">
          <h4>Inputs</h4>
          <StackList
              stacks={recipe.inputs}
              durationSeconds={recipe.durationSeconds}
              actionLabel="Find producers"
              onStackAction={onFindProducers}
              rateMode="rate"
          />
        </section>

        {recipe.tools.length > 0 && (
            <section className="detail-section">
              <h4>Tooling</h4>
              <StackList
                  stacks={recipe.tools}
                  actionLabel="Find producers"
                  onStackAction={onFindProducers}
                  rateMode="required"
              />
            </section>
        )}

        <section className="detail-section">
          <h4>Outputs</h4>
          <StackList
              stacks={recipe.outputs}
              durationSeconds={recipe.durationSeconds}
              actionLabel="Find uses"
              onStackAction={onFindUses}
              rateMode="rate"
          />
        </section>

        <section className="detail-section">
          <h4>Metadata</h4>
          <MetadataList recipe={recipe} />
        </section>

        <section className="detail-section">
          <h4>Recipe ID</h4>
          <code className="recipe-id">{recipe.id}</code>
        </section>
      </article>
  )
}

interface StackListProps {
  stacks: ExportStack[]
  actionLabel: string
  onStackAction: (stack: ExportStack) => void
  durationSeconds?: number
  rateMode: 'rate' | 'required'
}

function StackList({ stacks, durationSeconds, actionLabel, onStackAction, rateMode }: StackListProps) {
  if (stacks.length === 0) {
    return <p className="muted-text">None</p>
  }

  return (
      <ul className="stack-list">
        {stacks.map((stack, index) => (
            <li key={`${stack.kind}:${stack.id}:${stack.meta}:${index}`}>
              <div>
                <strong>{stack.displayName}</strong>
                <span>{formatStackIdentity(stack)}</span>
              </div>

              <div className="stack-rate-block">
                <span>{formatStackAmount(stack)}</span>
                <em>
                  {rateMode === 'rate' && durationSeconds !== undefined
                    ? formatStackRate(stack, durationSeconds)
                    : 'Not consumed'}
                </em>
                <button
                  className="stack-action-button"
                  type="button"
                  onClick={() => onStackAction(stack)}
                >
                  {actionLabel}
                </button>
              </div>
            </li>
        ))}
      </ul>
  )
}

interface MetadataListProps {
  recipe: NormalizedExportRecipe
}

function MetadataList({ recipe }: MetadataListProps) {
  const metadataEntries = Object.entries(recipe.metadata)

  if (metadataEntries.length === 0) {
    return <p className="muted-text">No metadata.</p>
  }

  return (
      <dl className="metadata-list">
        {metadataEntries.map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{String(value)}</dd>
            </div>
        ))}
      </dl>
  )
}

function getRecipeResultSummary(loadState: LoadState, resultCount: number): string {
  if (loadState.status !== 'loaded') {
    return 'Search results will appear here.'
  }

  return `${formatNumber(resultCount)} matching recipes.`
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