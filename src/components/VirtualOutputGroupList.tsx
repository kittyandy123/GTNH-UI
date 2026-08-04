import { useCallback, useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { OutputRecipeGroup } from '../types/recipeBrowser'
import { OutputGroupCard } from './OutputGroupCard'

const ESTIMATED_OUTPUT_GROUP_HEIGHT = 136
const OUTPUT_GROUP_GAP = 10
const OVERSCAN_OUTPUT_GROUP_COUNT = 6

interface VirtualOutputGroupListProps {
  groups: readonly OutputRecipeGroup[]
  onSelectOutputGroup: (group: OutputRecipeGroup) => void
}

export function VirtualOutputGroupList({
  groups,
  onSelectOutputGroup,
}: VirtualOutputGroupListProps) {
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const getItemKey = useCallback((index: number) => groups[index]?.key ?? index, [groups])

  // TanStack Virtual exposes mutable functions that React Compiler cannot
  // safely memoize. This component is intentionally skipped.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: groups.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => ESTIMATED_OUTPUT_GROUP_HEIGHT,
    getItemKey,
    gap: OUTPUT_GROUP_GAP,
    overscan: OVERSCAN_OUTPUT_GROUP_COUNT,
    useFlushSync: false,
  })

  useEffect(() => {
    rowVirtualizer.scrollToOffset(0)
  }, [groups, rowVirtualizer])

  return (
    <div ref={scrollElementRef} className={'recipe-list virtual-output-group-list'}>
      <div
        className={'virtual-output-group-list-inner'}
        style={{
          height: rowVirtualizer.getTotalSize(),
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const group = groups[virtualRow.index]

          if (!group) {
            return null
          }

          return (
            <div
              ref={rowVirtualizer.measureElement}
              className={'virtual-output-group-row'}
              data-index={virtualRow.index}
              key={group.key}
              style={{
                transform: `translateY(` + `${virtualRow.start}px)`,
              }}
            >
              <OutputGroupCard
                active={false}
                group={group}
                onSelect={() => onSelectOutputGroup(group)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
