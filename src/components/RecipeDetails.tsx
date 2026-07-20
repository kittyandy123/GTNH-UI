import { formatStackAmount, formatStackIdentity, formatStackRate } from '../lib/recipeHelpers'
import type { NormalizedExportRecipe } from '../lib/normalizeExport'
import type { ExportStack } from '../types/recipe'

interface RecipeDetailsProps {
    recipe: NormalizedExportRecipe
    onFindProducers: (stack: ExportStack) => void
    onFindUses: (stack: ExportStack) => void
    onPlanRecipe: () => void
    isPlanned: boolean
}

export function RecipeDetails({ recipe, onFindProducers, onFindUses, onPlanRecipe, isPlanned }: RecipeDetailsProps) {
    const planningUnsupported = recipe.planning?.supported === false

    const rateDurationSeconds =
        !planningUnsupported && recipe.durationSeconds > 0
            ? recipe.durationSeconds
            : undefined

    return (
        <article className="recipe-detail-card">
            <div className="recipe-detail-header">
                <div>
                    <h3>{recipe.machine.name}</h3>
                    <span>{recipe.machine.id}</span>
                </div>

                <button
                    className={isPlanned ? 'primary-action-button active' : 'primary-action-button'}
                    type="button"
                    onClick={onPlanRecipe}
                    disabled={planningUnsupported}
                    title={
                        planningUnsupported
                            ? 'This recipe cannot be used in planning because its timing is invalid.'
                            : undefined
                    }
                >
                    {planningUnsupported
                        ? 'Planning unavailable'
                        : isPlanned
                            ? 'Planned'
                            : 'Plan this recipe'}
                </button>
            </div>

            {planningUnsupported && (
                <section
                    className="recipe-planning-warning"
                    role="status"
                >
                    <strong>Planning unavailable</strong>
                    <p>{getPlanningWarning(recipe)}</p>
                </section>
            )}

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
                    durationSeconds={rateDurationSeconds}
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
                    durationSeconds={rateDurationSeconds}
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

function getPlanningWarning(recipe: NormalizedExportRecipe): string {
    const issues = recipe.planning?.issues ?? []

    if (issues.includes('sentinel-duration-suspected')) {
        return (
            'The exported duration is at or near the ' +
                'maximum signed integer value and appears ' +
                'to be a sentinel or invalid generated ' +
                'duration. The recipe remains available ' +
                'for browsing, but rates and machine counts ' +
                'cannot be calculated safely.'
        )
    }

    if (issues.includes('duration-overflow-suspected')) {
        return (
            'The exported duration appears to contain ' +
                'signed integer overflow. The recipe remains ' +
                'available for browsing, but rates and machine ' +
                'counts cannot be calculated safely.'
        )
    }

    if (issues.includes('zero-duration')) {
        return (
            'The exported recipe has a zero duration. ' +
                'The recipe remains available for browsing, ' +
                'but the rates and machine counts cannot be ' +
                'calculated safely.'
        )
    }

    return (
        'The exported recipe has invalid timing data. ' +
            'The recipe remains available for browsing, but ' +
            'rates and machine counts cannot be calculated safely.'
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
                            {rateMode === 'required'
                                ? 'Not consumed'
                                : durationSeconds !== undefined
                                    ? formatStackRate(stack, durationSeconds)
                                    : 'Rate unavailable'}
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