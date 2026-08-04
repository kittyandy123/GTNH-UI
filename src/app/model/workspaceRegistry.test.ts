import { describe, expect, it } from 'vitest'
import { DEFAULT_PLANNER_ASSUMPTIONS, type PlannerPlan } from '../../planner/model/plannerPlan'
import {
  activatePlannerWindow,
  activateRecipeBrowser,
  addPlannerWindow,
  closePlannerWindow,
  createWorkspaceRegistry,
  getActivePlannerWindow,
  renamePlannerWindow,
  updatePlannerWindowPlan,
} from './workspaceRegistry'

const CREATED_AT = '2026-08-04T04:00:00.000Z'

const UPDATED_AT = '2026-08-04T05:00:00.000Z'

describe('workspaceRegistry', () => {
  it('starts with the recipe browser active', () => {
    const registry = createWorkspaceRegistry()

    expect(registry).toEqual({
      plannerWindowsById: {},
      plannerWindowOrder: [],
      activeWorkspace: {
        kind: 'recipe-browser',
      },
    })

    expect(getActivePlannerWindow(registry)).toBeUndefined()
  })

  it('adds and activates a named planner window', () => {
    const originalPlan = createTestPlan('draft-plan', 'Draft plan')

    const registry = addPlannerWindow(createWorkspaceRegistry(), {
      id: 'window-1',
      name: '  Iron Line  ',
      plan: originalPlan,
      timestamp: CREATED_AT,
    })

    expect(registry.plannerWindowOrder).toEqual(['window-1'])

    expect(registry.activeWorkspace).toEqual({
      kind: 'planner',
      plannerWindowId: 'window-1',
    })

    expect(getActivePlannerWindow(registry)).toEqual({
      id: 'window-1',
      plan: {
        ...originalPlan,
        name: 'Iron Line',
      },
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    })

    expect(originalPlan.name).toBe('Draft plan')
  })

  it('keeps multiple planner windows in insertion order', () => {
    const firstRegistry = addPlannerWindow(createWorkspaceRegistry(), {
      id: 'window-1',
      name: 'Iron Line',
      plan: createTestPlan('plan-1', 'Draft one'),
      timestamp: CREATED_AT,
    })

    const secondRegistry = addPlannerWindow(firstRegistry, {
      id: 'window-2',
      name: 'Steel Line',
      plan: createTestPlan('plan-2', 'Draft two'),
      timestamp: UPDATED_AT,
    })

    expect(secondRegistry.plannerWindowOrder).toEqual(['window-1', 'window-2'])

    expect(secondRegistry.activeWorkspace).toEqual({
      kind: 'planner',
      plannerWindowId: 'window-2',
    })

    expect(Object.keys(secondRegistry.plannerWindowsById)).toEqual(['window-1', 'window-2'])
  })

  it('renames a planner window immutably', () => {
    const registry = addPlannerWindow(createWorkspaceRegistry(), {
      id: 'window-1',
      name: 'Iron Line',
      plan: createTestPlan('plan-1', 'Draft plan'),
      timestamp: CREATED_AT,
    })

    const renamedRegistry = renamePlannerWindow(registry, 'window-1', '  Steel Line  ', UPDATED_AT)

    expect(renamedRegistry.plannerWindowsById['window-1']).toMatchObject({
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
      plan: {
        name: 'Steel Line',
      },
    })

    expect(registry.plannerWindowsById['window-1']?.plan.name).toBe('Iron Line')
  })

  it('switches between planner and recipe-browser workspaces', () => {
    const registry = addPlannerWindow(createWorkspaceRegistry(), {
      id: 'window-1',
      name: 'Iron Line',
      plan: createTestPlan('plan-1', 'Draft plan'),
      timestamp: CREATED_AT,
    })

    const browserRegistry = activateRecipeBrowser(registry)

    expect(browserRegistry.activeWorkspace).toEqual({
      kind: 'recipe-browser',
    })

    const plannerRegistry = activatePlannerWindow(browserRegistry, 'window-1')

    expect(plannerRegistry.activeWorkspace).toEqual({
      kind: 'planner',
      plannerWindowId: 'window-1',
    })
  })

  it('closes planner windows without disturbing another active window', () => {
    const firstRegistry = addPlannerWindow(createWorkspaceRegistry(), {
      id: 'window-1',
      name: 'Iron Line',
      plan: createTestPlan('plan-1', 'Draft one'),
      timestamp: CREATED_AT,
    })

    const secondRegistry = addPlannerWindow(firstRegistry, {
      id: 'window-2',
      name: 'Steel Line',
      plan: createTestPlan('plan-2', 'Draft two'),
      timestamp: UPDATED_AT,
    })

    const withoutFirst = closePlannerWindow(secondRegistry, 'window-1')

    expect(withoutFirst.plannerWindowOrder).toEqual(['window-2'])

    expect(withoutFirst.activeWorkspace).toEqual({
      kind: 'planner',
      plannerWindowId: 'window-2',
    })

    const withoutActive = closePlannerWindow(withoutFirst, 'window-2')

    expect(withoutActive.plannerWindowOrder).toEqual([])

    expect(withoutActive.activeWorkspace).toEqual({
      kind: 'recipe-browser',
    })
  })

  it('updates a planner window plan immutably', () => {
    const registry = addPlannerWindow(createWorkspaceRegistry(), {
      id: 'window-1',
      name: 'Iron Line',
      plan: createTestPlan('plan-1', 'Iron Line'),
      timestamp: CREATED_AT,
    })

    const originalWindow = registry.plannerWindowsById['window-1']

    if (!originalWindow) {
      throw new Error('Expected planner window')
    }

    const updatedPlan: PlannerPlan = {
      ...originalWindow.plan,
      viewState: {
        ...originalWindow.plan.viewState,
        focusedStackKey: 'item:minecraft:iron_ingot:0',
      },
    }

    const updatedRegistry = updatePlannerWindowPlan(registry, 'window-1', updatedPlan, UPDATED_AT)

    expect(updatedRegistry.plannerWindowsById['window-1']).toMatchObject({
      plan: updatedPlan,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    })

    expect(registry.plannerWindowsById['window-1']).toBe(originalWindow)
    expect(originalWindow.plan.viewState.focusedStackKey).toBeUndefined()
  })

  it('rejects replacing a window with a different plan identity', () => {
    const registry = addPlannerWindow(createWorkspaceRegistry(), {
      id: 'window-1',
      name: 'Iron Line',
      plan: createTestPlan('plan-1', 'Iron Line'),
      timestamp: CREATED_AT,
    })

    expect(() =>
      updatePlannerWindowPlan(
        registry,
        'window-1',
        createTestPlan('plan-2', 'Steel Line'),
        UPDATED_AT,
      ),
    ).toThrow('Planner plan ID must match window plan ID: plan-1')
  })

  it('rejects invalid names, IDs, and duplicate windows', () => {
    const registry = addPlannerWindow(createWorkspaceRegistry(), {
      id: 'window-1',
      name: 'Iron Line',
      plan: createTestPlan('plan-1', 'Draft plan'),
      timestamp: CREATED_AT,
    })

    expect(() =>
      addPlannerWindow(registry, {
        id: 'window-1',
        name: 'Another Line',
        plan: createTestPlan('plan-2', 'Another draft'),
        timestamp: UPDATED_AT,
      }),
    ).toThrow('Planner window already exists: window-1')

    expect(() =>
      addPlannerWindow(createWorkspaceRegistry(), {
        id: '   ',
        name: 'Iron Line',
        plan: createTestPlan('plan-1', 'Draft plan'),
        timestamp: CREATED_AT,
      }),
    ).toThrow('Planner window ID must not be blank')

    expect(() => renamePlannerWindow(registry, 'window-1', '   ', UPDATED_AT)).toThrow(
      'Plan name must not be blank',
    )
  })
})

function createTestPlan(id: string, name: string): PlannerPlan {
  const rootNodeId = `node:${id}`

  return {
    id,
    name,
    rootNodeId,
    nodesById: {
      [rootNodeId]: {
        id: rootNodeId,
        kind: 'recipe',
        recipeId: `recipe:${id}`,
        status: 'planned',
      },
    },
    edgesById: {},
    assumptions: {
      ...DEFAULT_PLANNER_ASSUMPTIONS,
    },
    viewState: {
      selectedNodeId: rootNodeId,
      collapsedNodeIds: [],
    },
  }
}
