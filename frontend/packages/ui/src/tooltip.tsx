import React from 'react'
import {Paragraph, Theme, Tooltip} from 'tamagui'

export function SimpleTooltip({
  children,
  content,
}: {
  children: React.ReactNode
  content: string | React.ReactElement
}) {
  return (
    <Tooltip>
      <Tooltip.Trigger>{children}</Tooltip.Trigger>
      <Theme inverse>
        <Tooltip.Content
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

          <Paragraph size="$2" lineHeight="$1">
            {content}
          </Paragraph>
        </Tooltip.Content>
      </Theme>
    </Tooltip>
  )
}
