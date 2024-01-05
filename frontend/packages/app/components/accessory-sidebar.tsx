import {ScrollView, SizableText, XStack, YStack} from '@mintter/ui'
import {Allotment} from 'allotment'

export function AccessoryContainer({
  children,
  footer,
  title,
}: {
  children: React.ReactNode
  footer?: React.ReactNode
  title?: string
}) {
  return (
    <Allotment.Pane preferredSize="35%" maxSize={400} minSize={300}>
      <YStack height="100%">
        {title ? (
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$3"
            borderBottomColor="$borderColor"
            borderBottomWidth={1}
          >
            <SizableText>{title}</SizableText>
          </XStack>
        ) : null}
        <ScrollView f={1}>
          <YStack>{children}</YStack>
        </ScrollView>
        {footer}
      </YStack>
    </Allotment.Pane>
  )
}
