import {SizableText, Tooltip as BaseTooltip} from '@mintter/ui'
export function Tooltip({
  children,
  content,
  inline = false,
}: {
  children: React.ReactNode
  content: React.ReactNode | string
  inline?: boolean
}) {
  return (
    <BaseTooltip>
      <BaseTooltip.Trigger display={inline ? 'inline' : 'flex'}>
        {children}
      </BaseTooltip.Trigger>
      <BaseTooltip.Content
        margin={0}
        padding={0}
        paddingHorizontal="$2"
        theme="inverse"
      >
        <BaseTooltip.Arrow />
        <SizableText margin={0} padding={0} size="$1">
          {content}
        </SizableText>
      </BaseTooltip.Content>
    </BaseTooltip>
  )
}
