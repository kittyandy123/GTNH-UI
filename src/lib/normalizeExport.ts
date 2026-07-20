import type {
    ExportDiagnostics,
    ExportDocument,
    ExportRecipe,
    ExportStack,
    RecipePlanningInfo,
    RecipePlanningIssue,
} from '../types/recipe'

const MAX_SIGNED_INT_32 = 2_147_483_647
const SENTINEL_DURATION_FLOOR_TICKS = MAX_SIGNED_INT_32 - 2

export interface NormalizedExportDocument extends Omit<ExportDocument, 'recipes'> {
    recipes: NormalizedExportRecipe[]
}

export interface NormalizedExportRecipe extends Omit<ExportRecipe, 'tools'> {
    tools: ExportStack[]
}

export function normalizeExportDocument(document: ExportDocument): NormalizedExportDocument {
    const recipes = document.recipes.map((recipe) =>
        normalizedRecipe(recipe, document.schemaVersion),
    )

    return {
        ...document,
        diagnostics: normalizePlanningDiagnostics(
            document.diagnostics,
            recipes,
        ),
        recipes,
    }
}

function normalizedRecipe(recipe: ExportRecipe, schemaVersion: number): NormalizedExportRecipe {
    if (schemaVersion >= 2) {
        return {
            ...recipe,
            tools: recipe.tools ?? [],
            planning: normalizeRecipePlanning(recipe),
        }
    }

    const inputs: ExportStack[] = []
    const tools: ExportStack[] = []

    for (const stack of recipe.inputs) {
        if (isLegacyToolStack(stack)) {
            tools.push({
                ...stack,
                amount: stack.amount > 0 ? stack.amount : 1,
            })
        } else {
            inputs.push(stack)
        }
    }

    return {
        ...recipe,
        inputs,
        tools: [...tools, ...(recipe.tools ?? [])],
        planning: normalizeRecipePlanning(recipe),
    }
}

function normalizeRecipePlanning(recipe: ExportRecipe): RecipePlanningInfo | undefined {
    const issues = new Set<RecipePlanningIssue>(
        recipe.planning?.issues ?? [],
    )

    if (recipe.durationTicks < 0 || recipe.durationSeconds < 0) {
        issues.add('negative-duration')

        if (recipe.durationTicks < 0) {
            issues.add('duration-overflow-suspected')
        }
    } else if (recipe.durationTicks === 0 || recipe.durationSeconds === 0) {
        issues.add('zero-duration')
    } else if (recipe.durationTicks >= SENTINEL_DURATION_FLOOR_TICKS) {
        issues.add('sentinel-duration-suspected')
    }

    if (issues.size === 0) {
        return undefined
    }

    return {
        supported: false,
        issues: [...issues],
    }
}

function normalizePlanningDiagnostics(diagnostics: ExportDiagnostics, recipes: NormalizedExportRecipe[]): ExportDiagnostics {
    const nonPlannableRecipes = recipes.filter(
        (recipe) => recipe.planning?.supported === false,
    )

    const nonPlannableRecipesByMachine =
        nonPlannableRecipes.reduce<Record<string, number>>(
            (counts, recipe) => {
                counts[recipe.machine.id] =
                    (counts[recipe.machine.id] ?? 0) + 1

                return counts
            },
            {},
        )

    const nonPositiveDurationRecipes =
        nonPlannableRecipes.filter(
            (recipe) =>
                recipe.durationTicks <= 0 ||
                recipe.durationSeconds <= 0,
        ).length

    const suspectedDurationOverflowRecipes =
        nonPlannableRecipes.filter((recipe) =>
            recipe.planning?.issues.includes(
                'duration-overflow-suspected',
            ),
        ).length

    const suspectedSentinelDurationRecipes =
        nonPlannableRecipes.filter((recipe) =>
            recipe.planning?.issues.includes(
                'sentinel-duration-suspected',
            ),
        ).length

    const sampleNonPlannableRecipes =
        nonPlannableRecipes.slice(0, 25).map((recipe) => {
            const issues =
                recipe.planning?.issues.join(', ') ?? ''

            return (
                `${recipe.machine.id}: ${recipe.id} ` +
                `[ticks=${recipe.durationTicks}, ` +
                `issues=[${issues}]]`
            )
        })

    return {
        ...diagnostics,
        nonPlannableRecipes: nonPlannableRecipes.length,
        nonPlannableRecipesByMachine,
        nonPositiveDurationRecipes,
        suspectedDurationOverflowRecipes,
        suspectedSentinelDurationRecipes,
        sampleNonPlannableRecipes,
    }
}

function isLegacyToolStack(stack: ExportStack): boolean {
    return stack.kind === 'item' && stack.amount <= 0
}