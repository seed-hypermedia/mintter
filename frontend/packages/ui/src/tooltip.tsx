import React from 'react'
import {SizableText, Tooltip as TTooltip, TooltipProps} from 'tamagui'

export function Tooltip({
  children,
  content,
  placement,
  delay = 250,
}: {
  children: React.ReactNode
  content: string | React.ReactElement
  placement?: TooltipProps['placement']
  delay?: number
}) {
  return (
    <TTooltip placement={placement} delay={delay}>
      <TTooltip.Trigger asChild>{children}</TTooltip.Trigger>
      <TTooltip.Content
        enterStyle={{x: 0, y: -5, opacity: 0, scale: 0.9}}
        exitStyle={{x: 0, y: -5, opacity: 0, scale: 0.9}}
        scale={1}
        x={0}
        y={0}
        opacity={1}
        paddingVertical="$1"
        paddingHorizontal="$2"
        animation={[
          'quick',
          {
            opacity: {
              overshootClamping: true,
            },
          },
        ]}
      >
        <TTooltip.Arrow />
        <SizableText size="$1" margin={0} padding={0} lineHeight="$1">
          {content}
        </SizableText>
      </TTooltip.Content>
    </TTooltip>
  )
}
