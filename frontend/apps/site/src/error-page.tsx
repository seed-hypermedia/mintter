import {YStack, PageSection, SizableText} from '@mintter/ui'
import {SiteHead} from './site-head'

export function ErrorPage({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <YStack flex={1}>
      <SiteHead pageTitle="Not Found" />
      <PageSection.Root>
        <PageSection.Side />
        <PageSection.Content tag="main" id="main-content" tabIndex={-1}>
          <YStack
            paddingVertical="$7"
            paddingHorizontal="$5"
            borderRadius="$5"
            elevation="$1"
            borderColor="$color5"
            borderWidth={1}
            backgroundColor="$color3"
            gap="$3"
          >
            <SizableText size="$5" fontWeight="800" textAlign="center">
              {title}
            </SizableText>
            <SizableText color="$color9" textAlign="center">
              {description}
            </SizableText>
          </YStack>
        </PageSection.Content>
        <PageSection.Side />
      </PageSection.Root>
    </YStack>
  )
}
