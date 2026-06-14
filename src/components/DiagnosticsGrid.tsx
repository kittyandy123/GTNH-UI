import { formatNumber } from '../lib/recipeHelpers'
import type { ExportDiagnostics } from '../types/recipe'

interface DiagnosticsGridProps {
    diagnostics: ExportDiagnostics
}

export function DiagnosticsGrid({ diagnostics }: DiagnosticsGridProps) {
    return (
        <section className="diagnostics-grid" aria-label="Export diagnostics">
            <MetricCard
                label="Total recipes"
                value={formatNumber(diagnostics.totalRecipes)}
            />
            <MetricCard
                label="Duplicate recipes skipped"
                value={formatNumber(diagnostics.duplicateRecipesSkipped)}
            />
            <MetricCard
                label="Display name fallbacks"
                value={formatNumber(diagnostics.displayNameFallbacks)}
            />
            <MetricCard
                label="Recipe errors"
                value={formatNumber(diagnostics.recipesSkippedDueToError)}
            />

            {diagnostics.toolInputsExtracted !== undefined && (
                <MetricCard
                    label="Tool inputs extracted"
                    value={formatNumber(diagnostics.toolInputsExtracted)}
                />
            )}

            {diagnostics.zeroAmountInputsRemaining !== undefined && (
                <MetricCard
                    label="Zero-amount inputs remaining"
                    value={formatNumber(diagnostics.zeroAmountInputsRemaining)}
                />
            )}
        </section>
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