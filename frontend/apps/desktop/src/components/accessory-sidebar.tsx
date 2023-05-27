import {ScrollView, SizableText, YStack} from '@mintter/ui'
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
      <YStack height="100%">
        <ScrollView>
          {title ? (
            <SizableText size="$6" fontWeight="700" margin="$4" color="$gray12">
              {title}
            </SizableText>
          ) : null}
          {children}
        </ScrollView>
      </YStack>
    </Allotment.Pane>
  )
}
