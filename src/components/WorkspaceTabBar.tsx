import type { WorkspaceRegistry } from '../app/model/workspaceRegistry'

interface WorkspaceTabBarProps {
  registry: WorkspaceRegistry
  onActivateRecipeBrowser: () => void
  onActivatePlannerWindow: (plannerWindowId: string) => void
  onRenamePlannerWindow: (plannerWindowId: string) => void
  onClosePlannerWindow: (plannerWindowId: string) => void
}

export function WorkspaceTabBar({
  registry,
  onActivateRecipeBrowser,
  onActivatePlannerWindow,
  onRenamePlannerWindow,
  onClosePlannerWindow,
}: WorkspaceTabBarProps) {
  const recipeBrowserIsActive = registry.activeWorkspace.kind === 'recipe-browser'

  return (
    <nav className="workspace-tab-bar" aria-label="Application workspaces">
      <div className={recipeBrowserIsActive ? 'workspace-tab-item active' : 'workspace-tab-item'}>
        <button
          className="workspace-tab"
          type="button"
          aria-current={recipeBrowserIsActive ? 'page' : undefined}
          onClick={onActivateRecipeBrowser}
        >
          Recipe Browser
        </button>
      </div>

      {registry.plannerWindowOrder.map((plannerWindowId) => {
        const plannerWindow = registry.plannerWindowsById[plannerWindowId]

        if (!plannerWindow) {
          return null
        }

        const isActive =
          registry.activeWorkspace.kind === 'planner' &&
          registry.activeWorkspace.plannerWindowId === plannerWindow.id

        return (
          <div
            className={isActive ? 'workspace-tab-item active' : 'workspace-tab-item'}
            key={plannerWindow.id}
          >
            <button
              className="workspace-tab"
              type="button"
              aria-current={isActive ? 'page' : undefined}
              title={plannerWindow.plan.name}
              onClick={() => onActivatePlannerWindow(plannerWindow.id)}
            >
              {plannerWindow.plan.name}
            </button>

            <button
              className="workspace-tab-rename"
              type="button"
              aria-label={`Rename ${plannerWindow.plan.name}`}
              title={`Rename ${plannerWindow.plan.name}`}
              onClick={() => onRenamePlannerWindow(plannerWindow.id)}
            >
              Rename
            </button>

            <button
              className="workspace-tab-close"
              type="button"
              aria-label={`Close ${plannerWindow.plan.name}`}
              title={`Close ${plannerWindow.plan.name}`}
              onClick={() => onClosePlannerWindow(plannerWindow.id)}
            >
              x
            </button>
          </div>
        )
      })}
    </nav>
  )
}
