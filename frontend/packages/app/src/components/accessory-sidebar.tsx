import {ScrollView, SizableText, XStack, YStack} from '@mintter/ui'
import {Allotment} from 'allotment'

export function AccessoryContainer({
  children,
  title,
}: {
  children: React.ReactNode
  title?: string
}) {
  return (
    <Allotment.Pane preferredSize="35%">
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
      <ScrollView height={'100%'}>
        <YStack padding="$4">{children}</YStack>
      </ScrollView>
    </Allotment.Pane>
  )
}
