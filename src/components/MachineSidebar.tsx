import { formatNumber } from '../lib/recipeHelpers'

interface MachineCount {
    machineId: string
    count: number
}

interface MachineSidebarProps {
    machineCounts: MachineCount[]
    selectedMachineId: string | undefined
    loaded: boolean
    onSelectMachine: (machineId: string | undefined) => void
}

export function MachineSidebar({ machineCounts, selectedMachineId, loaded, onSelectMachine }: MachineSidebarProps) {
    return (
        <aside className="machine-sidebar" aria-label="Machine filters">
            <div className="panel-heading">
                <h2>Machines</h2>
                <p>
                    {loaded
                      ? `${machineCounts.length} recipe maps loaded.`
                      : 'Recipe counts will appear here.'}
                </p>
            </div>

            {loaded ? (
                <div className="machine-list">
                    <button
                        className={
                          selectedMachineId === undefined
                            ? 'machine-button active'
                            : 'machine-button'
                        }
                        type="button"
                        onClick={() => onSelectMachine(undefined)}
                    >
                        <span>All machines</span>
                        <strong>All</strong>
                    </button>

                    {machineCounts.map((machine) => (
                        <button
                          className={
                            selectedMachineId === machine.machineId
                              ? 'machine-button active'
                              : 'machine-button'
                          }
                          key={machine.machineId}
                          type="button"
                          onClick={() => onSelectMachine(machine.machineId)}
                        >
                            <span>{machine.machineId}</span>
                            <strong>{formatNumber(machine.count)}</strong>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="empty-card">
                    Load <code>recipes.json</code> to view machine filters.
                </div>
            )}
        </aside>
    )
}