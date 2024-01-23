import {ReactNode, useRef, useState} from 'react'
import {Virtuoso} from 'react-virtuoso'
import {View, XStack, YStack} from 'tamagui'

export function List<Item>({
  items,
  renderItem,
  header,
  footer,
}: {
  items: Item[]
  renderItem: (row: {item: Item; containerWidth: number}) => ReactNode
  header?: ReactNode | null
  footer?: ReactNode | null
}) {
  const virtuoso = useRef(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  return (
    <YStack
      f={1}
      alignSelf="stretch"
      height={'100%'}
      onLayout={(e) => {
        setContainerHeight(e.nativeEvent.layout.height)
        setContainerWidth(e.nativeEvent.layout.width)
      }}
    >
      <Virtuoso
        fixedItemHeight={42}
        ref={virtuoso}
        style={{
          height: containerHeight,
          display: 'flex',
          overflowY: 'scroll',
          overflowX: 'hidden',
        }}
        increaseViewportBy={{
          top: 800,
          bottom: 800,
        }}
        components={{
          Header: () => header || null,
          Footer: () => footer || <View style={{height: 30}} />,
        }}
        className="main-scroll-wrapper"
        totalCount={items?.length || 0}
        itemContent={(index) => {
          const item = items?.[index]
          if (!item) return null
          return (
            <XStack jc="center" width={containerWidth}>
              {renderItem({item, containerWidth})}
            </XStack>
          )
        }}
      />
    </YStack>
  )
}
