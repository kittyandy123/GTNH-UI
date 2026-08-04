import {
    useCallback,
    useEffect,
    useRef,
} from 'react'
import {
    useVirtualizer,
} from '@tanstack/react-virtual'
import type {
    NormalizedExportRecipe,
} from '../lib/normalizeExport'
import {
    RecipeCard,
} from './RecipeCard'

const ESTIMATED_RECIPE_CARD_HEIGHT = 136
const RECIPE_CARD_GAP = 10
const OVERSCAN_RECIPE_COUNT = 6

interface VirtualRecipeListProps {
    recipes: readonly NormalizedExportRecipe[]
    selectedRecipeId: string | undefined
    onSelectRecipe: (recipeId: string) => void
}

export function VirtualRecipeList({
                                      recipes,
                                      selectedRecipeId,
                                      onSelectRecipe,
                                  }: VirtualRecipeListProps) {
    const scrollElementRef =
        useRef<HTMLDivElement>(null)

    const getItemKey = useCallback(
        (index: number) =>
            recipes[index]?.id ?? index,
        [recipes],
    )

    // TanStack Virtual exposes mutable functions that React Compiler cannot
    // safely memoize. This component is intentionally skipped.
    // eslint-disable-next-line react-hooks/incompatible-library
    const rowVirtualizer = useVirtualizer({
        count: recipes.length,
        getScrollElement: () =>
            scrollElementRef.current,
        estimateSize: () =>
            ESTIMATED_RECIPE_CARD_HEIGHT,
        getItemKey,
        gap: RECIPE_CARD_GAP,
        overscan: OVERSCAN_RECIPE_COUNT,
        useFlushSync: false,
    })

    useEffect(() => {
        rowVirtualizer.scrollToOffset(0)
    }, [
        recipes,
        rowVirtualizer,
    ])

    return (
        <div
            ref={scrollElementRef}
            className={
                'recipe-list virtual-recipe-list'
            }
        >
            <div
                className={
                    'virtual-recipe-list-inner'
                }
                style={{
                    height:
                        rowVirtualizer.getTotalSize(),
                }}
            >
                {rowVirtualizer
                    .getVirtualItems()
                    .map((virtualRow) => {
                        const recipe =
                            recipes[
                                virtualRow.index
                                ]

                        if (!recipe) {
                            return null
                        }

                        return (
                            <div
                                ref={
                                    rowVirtualizer.measureElement
                                }
                                className={
                                    'virtual-recipe-row'
                                }
                                data-index={
                                    virtualRow.index
                                }
                                key={recipe.id}
                                style={{
                                    transform:
                                        `translateY(` +
                                        `${virtualRow.start}px)`,
                                }}
                            >
                                <RecipeCard
                                    active={
                                        selectedRecipeId ===
                                        recipe.id
                                    }
                                    recipe={recipe}
                                    onSelect={() =>
                                        onSelectRecipe(
                                            recipe.id,
                                        )
                                    }
                                />
                            </div>
                        )
                    })}
            </div>
        </div>
    )
}
