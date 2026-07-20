# GTNH Planner UI

A browser-based recipe explorer and production-planning application for **GregTech: New Horizons**.

GTNH Planner UI consumes recipe data exported from a running GTNH instance by the separate [GTNH Calculator Utility](https://github.com/kittyandy123/GTNH) forge mod.

## Project status

GTNH Planner UI is under active development.

The current application provides a functional recipe browser, recipe-detail navigation, schema-v2 data validation, and an early graph-backed quick-planning workflow.

It should currently be treated as a development application rather than a complete GTNH production planner.

## Architecture

The project is intentionally divided into two repositories.

### GTNH Calculator Utility exporter

The Forge exporter runs inside GTNH and is responsible for:

- Reading recipes from Minecraft and GregTech runtime registries.
- Preserving exact recipe identities.
- Distinguishing consumed inputs from non-consumed tooling.
- Extracting programmed circuits, chances, duration, EU/t, and metadata.
- Recording export diagnostics.
- Writing the resulting `recipes.json` document.

The exporter is the authoritative source for Minecraft and GTNH semantics that can be determined from the loaded game.

### GTNH Planner UI

This repository is responsible for:

- Loading and validating exported recipe data.
- Searching and browsing exact recipes.
- Presenting grouped output-index views.
- Displaying inputs, tooling, outputs, metadata, duration, and EU/t.
- Navigating between producers and consumers.
- Calculating basic rates and required machine counts.
- Building graph-backed production plans.
- Eventually managing named plans, saved base data, progression, and richer machine behavior.

The UI should not reproduce or guess recipe semantics that the exporter can determine more accurately.

## Data contract

`recipes.json` is the contract between the exporter and this application.

The UI currently supports:

```text
schemaVersion: 2
```

Documents are validated at the loading boundary before normalization or planner logic runs.

Validation uses the exporter's Draft 2020-12 JSON Schema:
```text
src/contracts/recipes-v2.schema.json
```

The representative compatibility fixture is stored at:
```text
src/test/fixtures/schema-v2-representative.json
```

The authoritative schema and fixture remain in the exporter repository. The copies in this repository must be updated together whenever the exporter contract changes.

Synchronization details and the current exporter baseline are recorded in:
```text
src/contracts/README.md
```

## Current capabilities

The application currently supports:

- Loading a static `recipes.json` export.
- Runtime schema-v2 validation.
- Export diagnostics.
- Machine filtering and recipe counts.
- Search across recipes, inputs, outputs, machines, and identifiers.
- Exact-recipe and output-index views.
- Capped result rendering for large catalogs.
- Recipe input, tooling, output, chance, and metadata details.
- Producer and consumer navigation.
- Primary-output selection.
- Constraint-driven quick planning from wanted output rates or provided input rates.
- Automatic and fixed whole-machine count modes.
- Required, produced, excess, shortage, and limiting-rate summaries.
- Base-timing EU/t, power, and machine-capacity estimates.
- A graph-backed single-recipe plan preview.

## Running locally

### 1. Install dependencies
```bash
npm install
```

### 2. Provide recipe data
Generate `recipes.json` with the GTNH Calculator Utility exporter and place it at:
```text
public/recipes.json
```

Vite serves this file as:
```text
/recipes.json
```

The application will reject missing, malformed, or unsupported exports with a loading error.

### 3. Start the development server
```bash
npm run dev
```

Vite will print the local development URL, normally:
```text
http://localhost:5173/
```

## Development commands

Run the development server:
```bash
npm run dev
```

Run the automated tests once:
```bash
npm run test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run ESLint:
```bash
npm run lint
```

Create a production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Testing

The current test suite verifies that:

- The representative exporter schema-v2 fixture is accepted.
- Unsupported schema versions are rejected with a clear error.
- Malformed schema-v2 documents are rejected.

The fixture is copied directly from the exporter repository so that the test also acts as a cross-repository compatibility check.

GitHub Actions runs the complete validation pipeline for pull requests and pushes to `master`:

- `npm ci`
- `npm run test`
- `npm run lint`
- `npm run build`

The workflow is defined in [`.github/workflows/build-and-test.yml`](.github/workflows/build-and-test.yml).

## Current limitations

The project currently has several deliberate limitations:

- Only schema version 2 is accepted by the normal loading path.
- Recipe data must currently be provided as static `public/recipes.json`.
- Search and filtering still operate primarily over in-memory arrays.
- Result rendering is capped rather than virtualized.
- The planner currently focuses on a single root recipe and direct graph data.
- Recursive producer selection and full multi-node calculation are incomplete.
- Named planner workspaces and persistence are not yet implemented.
- Recipe IDs should not yet be treated as permanent references across arbitrary pack or exporter upgrades.
- Machine tiers, overclocking, parallelization, and multiblock constraints are not yet modeled authoritatively.
- Machine, item, and fluid icons are not yet exported.
- Live inventory, power, machine, and server-state integration are not present.
- GTNH recipe-system coverage is limited by the exporter's current coverage.

Unsupported machine behavior must remain explicit rather than being silently treated as generic production math.

## Development direction

Near-term UI work is focused on:

1. Expanding automated tests around contract and normalization behavior.
2. Introducing a catalog/index boundary for large recipe collections.
3. Adding the application shell and named planner workspaces.
4. Persisting workspace and plan state.
5. Moving planner mutations behind command-style domain operations.
6. Implementing recursive producer selection and graph traversal.
7. Adding authoritative machine definitions and practical build behavior.
8. Supporting byproduct routing, imports, stockpiles, and voiding.
9. Comparing planned production against manually recorded base capabilities.
10. Preparing for optional exporter bundles and read-only game snapshots.

The long-term goal is a GTNH-aware engineering application rather than only a generic item-in/item-out calculator.

## Related repository

The recipe exporter is maintained separately:
[GTNH Calculator Utility](https://github.com/kittyandy123/GTNH)
