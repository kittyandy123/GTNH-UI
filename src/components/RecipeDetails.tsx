import { formatStackAmount, formatStackIdentity, formatStackRate } from '../lib/recipeHelpers'
import type { NormalizedExportRecipe } from '../lib/normalizeExport'
import type { ExportStack } from '../types/recipe'

interface RecipeDetailsProps {
    recipe: NormalizedExportRecipe
    onFindProducers: (stack: ExportStack) => void
    onFindUses: (stack: ExportStack) => void
}

export function RecipeDetails({ recipe, onFindProducers, onFindUses }: RecipeDetailsProps) {
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