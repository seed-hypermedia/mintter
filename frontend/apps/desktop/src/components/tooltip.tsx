import {SizableText, Tooltip as BaseTooltip} from '@mintter/ui'
export function Tooltip({
  children,
  content,
}: {
  children: React.ReactNode
  content: React.ReactNode | string
}) {
  return (
    <BaseTooltip placement="top-end">
      <BaseTooltip.Trigger>{children}</BaseTooltip.Trigger>
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
