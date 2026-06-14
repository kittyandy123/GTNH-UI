import { formatStackCompact } from '../lib/recipeHelpers'
import type { ExportStack } from '../types/recipe'

interface StackLineProps {
    label: string
    stacks: ExportStack[]
}

export function StackLine({ label, stacks }: StackLineProps) {
    return (
        <div className="stack-line">
            <span className="stack-line-label">{label}</span>
            <span className="stack-line-value">
                {stacks.length > 0 ? stacks.map(formatStackCompact).join(', ') : 'None'}
            </span>
        </div>
    )
}