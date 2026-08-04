import type { PlannerPlan } from '../../planner/model/plannerPlan'

export type ActiveWorkspace =
  | {
      kind: 'recipe-browser'
    }
  | {
      kind: 'planner'
      plannerWindowId: string
    }

export interface PlannerWindow {
  readonly id: string
  readonly plan: PlannerPlan
  readonly createdAt: string
  readonly updatedAt: string
}

export interface WorkspaceRegistry {
  readonly plannerWindowsById: Readonly<Record<string, PlannerWindow>>
  readonly plannerWindowOrder: readonly string[]
  readonly activeWorkspace: ActiveWorkspace
}

export interface AddPlannerWindowInput {
  id: string
  name: string
  plan: PlannerPlan
  timestamp: string
}

export function createWorkspaceRegistry(): WorkspaceRegistry {
  return {
    plannerWindowsById: {},
    plannerWindowOrder: [],
    activeWorkspace: {
      kind: 'recipe-browser',
    },
  }
}

export function addPlannerWindow(
  registry: WorkspaceRegistry,
  input: AddPlannerWindowInput,
): WorkspaceRegistry {
  const id = requireNonBlank(input.id, 'Planner window ID')

  if (Object.prototype.hasOwnProperty.call(registry.plannerWindowsById, id)) {
    throw new Error(`Planner window already exists: ${id}`)
  }

  const name = requireNonBlank(input.name, 'Plan name')

  const timestamp = requireNonBlank(input.timestamp, 'Timestamp')

  const plannerWindow: PlannerWindow = {
    id,
    plan: {
      ...input.plan,
      name,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  return {
    plannerWindowsById: {
      ...registry.plannerWindowsById,
      [id]: plannerWindow,
    },
    plannerWindowOrder: [...registry.plannerWindowOrder, id],
    activeWorkspace: {
      kind: 'planner',
      plannerWindowId: id,
    },
  }
}

export function renamePlannerWindow(
  registry: WorkspaceRegistry,
  plannerWindowId: string,
  name: string,
  timestamp: string,
): WorkspaceRegistry {
  const plannerWindow = getRequiredPlannerWindow(registry, plannerWindowId)

  const normalizedName = requireNonBlank(name, 'Plan name')

  if (normalizedName === plannerWindow.plan.name) {
    return registry
  }

  return {
    ...registry,
    plannerWindowsById: {
      ...registry.plannerWindowsById,
      [plannerWindow.id]: {
        ...plannerWindow,
        plan: {
          ...plannerWindow.plan,
          name: normalizedName,
        },
        updatedAt: requireNonBlank(timestamp, 'Timestamp'),
      },
    },
  }
}

export function updatePlannerWindowPlan(
  registry: WorkspaceRegistry,
  plannerWindowId: string,
  plan: PlannerPlan,
  timestamp: string,
): WorkspaceRegistry {
  const plannerWindow = getRequiredPlannerWindow(registry, plannerWindowId)

  if (plan.id !== plannerWindow.plan.id) {
    throw new Error(`Planner plan ID must match window plan ID: ${plannerWindow.plan.id}`)
  }

  if (plan === plannerWindow.plan) {
    return registry
  }

  return {
    ...registry,
    plannerWindowsById: {
      ...registry.plannerWindowsById,
      [plannerWindow.id]: {
        ...plannerWindow,
        plan,
        updatedAt: requireNonBlank(timestamp, 'Timestamp'),
      },
    },
  }
}

export function activateRecipeBrowser(registry: WorkspaceRegistry): WorkspaceRegistry {
  if (registry.activeWorkspace.kind === 'recipe-browser') {
    return registry
  }

  return {
    ...registry,
    activeWorkspace: {
      kind: 'recipe-browser',
    },
  }
}

export function activatePlannerWindow(
  registry: WorkspaceRegistry,
  plannerWindowId: string,
): WorkspaceRegistry {
  const plannerWindow = getRequiredPlannerWindow(registry, plannerWindowId)

  if (
    registry.activeWorkspace.kind === 'planner' &&
    registry.activeWorkspace.plannerWindowId === plannerWindow.id
  ) {
    return registry
  }

  return {
    ...registry,
    activeWorkspace: {
      kind: 'planner',
      plannerWindowId: plannerWindow.id,
    },
  }
}

export function closePlannerWindow(
  registry: WorkspaceRegistry,
  plannerWindowId: string,
): WorkspaceRegistry {
  const plannerWindow = getRequiredPlannerWindow(registry, plannerWindowId)

  const plannerWindowsById: Record<string, PlannerWindow> = {
    ...registry.plannerWindowsById,
  }

  delete plannerWindowsById[plannerWindow.id]

  const closedActiveWindow =
    registry.activeWorkspace.kind === 'planner' &&
    registry.activeWorkspace.plannerWindowId === plannerWindow.id

  return {
    plannerWindowsById,
    plannerWindowOrder: registry.plannerWindowOrder.filter((id) => id !== plannerWindow.id),
    activeWorkspace: closedActiveWindow
      ? {
          kind: 'recipe-browser',
        }
      : registry.activeWorkspace,
  }
}

export function getActivePlannerWindow(registry: WorkspaceRegistry): PlannerWindow | undefined {
  if (registry.activeWorkspace.kind !== 'planner') {
    return undefined
  }

  return registry.plannerWindowsById[registry.activeWorkspace.plannerWindowId]
}

function getRequiredPlannerWindow(
  registry: WorkspaceRegistry,
  plannerWindowId: string,
): PlannerWindow {
  const normalizedId = requireNonBlank(plannerWindowId, 'Planner window ID')

  const plannerWindow = registry.plannerWindowsById[normalizedId]

  if (!plannerWindow) {
    throw new Error(`Unknown planner window: ${normalizedId}`)
  }

  return plannerWindow
}

function requireNonBlank(value: string, label: string): string {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    throw new Error(`${label} must not be blank`)
  }

  return normalizedValue
}
