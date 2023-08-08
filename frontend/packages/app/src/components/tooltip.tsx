import {SizableText, Tooltip as BaseTooltip, TooltipProps} from '@mintter/ui'
export function Tooltip({
  children,
  content,
  inline = false,
  placement = 'top-end',
}: {
  children: React.ReactNode
  content: React.ReactNode | string
  inline?: boolean
  placement?: TooltipProps['placement']
}) {
  return (
    <BaseTooltip placement={placement}>
      <BaseTooltip.Trigger display={inline ? 'inline' : 'flex'}>
        {children}
      </BaseTooltip.Trigger>
      <BaseTooltip.Content
        margin={0}
        padding={0}
        paddingHorizontal="$2"
        className="no-window-drag"
        theme="inverse"
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
        <BaseTooltip.Arrow />
        <SizableText margin={0} padding={0} size="$1">
          {content}
        </SizableText>
      </BaseTooltip.Content>
    </BaseTooltip>
  )
}
