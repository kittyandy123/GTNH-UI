import { useState } from 'react'

export type WorkspaceNameDialogMode = 'create' | 'rename'

interface WorkspaceNameDialogProps {
  mode: WorkspaceNameDialogMode
  initialName: string
  onCancel: () => void
  onSubmit: (name: string) => void
}

export function WorkspaceNameDialog({
  mode,
  initialName,
  onCancel,
  onSubmit,
}: WorkspaceNameDialogProps) {
  const [name, setName] = useState(initialName)

  const normalizedName = name.trim()

  const unchangedRename = mode === 'rename' && normalizedName === initialName.trim()

  return (
    <div className="workspace-name-dialog-backdrop">
      <form
        className="workspace-name-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-name-dialog-title"
        aria-describedby="workspace-name-dialog-description"
        onSubmit={(event) => {
          event.preventDefault()

          if (normalizedName && !unchangedRename) {
            onSubmit(normalizedName)
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
          }
        }}
      >
        <header className="workspace-name-dialog-header">
          <p className="eyebrow">Planner workspace</p>

          <h2 id="workspace-name-dialog-title">
            {mode === 'create' ? 'Name this plan' : 'Rename plan'}
          </h2>

          <p id="workspace-name-dialog-description">
            {mode === 'create'
              ? 'Choose a name for the new planner workspace.'
              : 'Change the name shown in the workspace bar.'}
          </p>
        </header>

        <label className="workspace-name-field" htmlFor="workspace-name">
          Plan name
          <input
            id="workspace-name"
            autoFocus
            autoComplete="off"
            type="text"
            value={name}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <div className="workspace-name-dialog-actions">
          <button className="secondary-action-button" type="button" onClick={onCancel}>
            Cancel
          </button>

          <button
            className="primary-action-button"
            type="submit"
            disabled={!normalizedName || unchangedRename}
          >
            {mode === 'create' ? 'Create workspace' : 'Save name'}
          </button>
        </div>
      </form>
    </div>
  )
}
