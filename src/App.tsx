import './App.css'

function App() {
  return (
      <main className="app-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">GT New Horizons</p>
            <h1>Recipe Planner</h1>
          </div>

          <section className="export-summary" aria-label="Loaded export summary">
            <span className="status-pill">No export loaded</span>
            <span>Recipe browser POC</span>
          </section>
        </header>

        <section className="search-panel" aria-label="Recipe search">
          <label className="search-label" htmlFor="recipe-search">
            Search recipes
          </label>
          <input
            id="recipe-search"
            className="search-input"
            type="search"
            placeholder="Search by item, fluid, machine, or recipe ID..."
            disabled
          />
        </section>

        <section className="planner-layout">
          <aside className="machine-sidebar" aria-label="Machine filters">
            <div className="panel-heading">
              <h2>Machines</h2>
              <p>Recipe counts will appear here.</p>
            </div>

            <div className="empty-card">
              Load <code>recipes.json</code> to view machine filters.
            </div>
          </aside>

          <section className="recipe-results" aria-label="Recipe results">
            <div className="panel-heading">
              <h2>Recipes</h2>
              <p>Search results will appear here.</p>
            </div>

            <div className="empty-state">
              <h3>Ready for recipe data</h3>
              <p>
                Next we will load the exported recipe file, show diagnostics, and
                render a capped list of searchable recipes.
              </p>
            </div>
          </section>

          <aside className="recipe-details" aria-label="Selected recipe details">
            <div className="panel-heading">
              <h2>Details</h2>
              <p>Select a recipe to inspect inputs, outputs, duration, EU/t, and metadata.</p>
            </div>

            <div className="empty-card">
              No recipe selected.
            </div>
          </aside>
        </section>
      </main>
  )
}

export default App