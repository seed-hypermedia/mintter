import {PageSection, SizableText, YStack} from '@mintter/ui'
import {SiteHead} from '../../src/site-head'

export default function NotFoundPage() {
  return (
    <YStack flex={1}>
      <SiteHead pageTitle="Secret Setup URL" />
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
              Welcome to your new site. Paste this URL into the Mintter app to
              publish your group to this new site.
            </SizableText>
          </YStack>
        </PageSection.Content>
        <PageSection.Side />
      </PageSection.Root>
    </YStack>
  )
}
