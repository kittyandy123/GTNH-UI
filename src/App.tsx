import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { loadRecipeExport } from './lib/loadRecipes'
import type { ExportDocument } from './types/recipe'

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; data: ExportDocument }
  | { status: 'error'; message: string }

function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function loadRecipes() {
      try {
        const data = await loadRecipeExport()

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
            disabled={loadState.status !== 'loaded'}
          />
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
                  {machineCounts.map((machine) => (
                      <button
                        className="machine-button"
                        key={machine.machineId}
                        type="button"
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
              <p>
                {loadState.status === 'loaded'
                  ? 'Searchable recipe list comes next.'
                  : 'Search results will appear here.'}
              </p>
            </div>

            <div className="empty-state">
              <h3>
                {loadState.status === 'loaded'
                  ? 'Recipe export loaded'
                  : 'Ready for recipe data'}
              </h3>
              <p>
                {loadState.status === 'loaded'
                  ? 'Next we will add capped recipe results, basic search, and recipe selection.'
                  : 'Next we will load the exported recipe file, show diagnostics, and render a capped list of searchable recipes.'}
              </p>
            </div>
          </section>

          <aside className="recipe-details" aria-label="Selected recipe details">
            <div className="panel-heading">
              <h2>Details</h2>
              <p>Select a recipe to inspect inputs, outputs, duration, EU/t, and metadata.</p>
            </div>

            {loadState.status === 'loaded' ? (
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value)
}

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export default App