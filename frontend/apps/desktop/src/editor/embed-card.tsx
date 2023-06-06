import React, {useMemo} from 'react'
import {SizableText, Theme, Tooltip, XStack, YStack} from 'tamagui'
import {BlockNode, Document} from '@mintter/shared'

export function EmbedCard({
  children,
  document,
  blockId,
}: {
  children: React.ReactNode
  document: Document | undefined
  blockId: string
}) {
  return document ? (
    <Tooltip>
      <Tooltip.Trigger>{children}</Tooltip.Trigger>
      {/* <Theme inverse> */}
      <Tooltip.Content
        elevate
        enterStyle={{x: 0, y: -5, opacity: 0, scale: 0.9}}
        exitStyle={{x: 0, y: -5, opacity: 0, scale: 0.9}}
        scale={1}
        x={0}
        y={0}
        opacity={1}
        animation={[
          'quick',
          {
            opacity: {
              overshootClamping: true,
            },
          },
        ]}
      >
        <Tooltip.Arrow />
        <YStack gap={8}>
          <SizableText fontSize={10} lineHeight={11} fontWeight="700">
            {document.title}
          </SizableText>
          <MiniBlockNodes blockId={blockId} blocks={document.children} />
        </YStack>
      </Tooltip.Content>
      {/* </Theme> */}
    </Tooltip>
  ) : null
}

function MiniBlockNodes({
  blocks,
  blockId,
}: {
  blocks: Array<BlockNode>
  blockId: string
}) {
  return blocks.length ? (
    <YStack maxWidth={200} gap={6} maxHeight={300}>
      {blocks.slice(0, 5).map((bn) => (
        <MiniBlockNode entry={bn} blockId={blockId} />
      ))}
    </YStack>
  ) : null
}

function MiniBlockNode({entry, blockId}: {entry: BlockNode; blockId: string}) {
  let isActive = useMemo(() => entry.block?.id == blockId, [])
  return (
    <YStack
      gap={4}
      backgroundColor={isActive ? '$yellow4' : 'transparent'}
      padding={3}
    >
      <SizableText fontSize={7} lineHeight={8}>
        {entry.block?.text}
      </SizableText>

      {entry.children.length ? (
        <MiniBlockNodes blocks={entry.children} blockId={blockId} />
      ) : null}
    </YStack>
  )
}
