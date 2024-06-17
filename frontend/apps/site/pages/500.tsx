import {PageSection, SizableText, YStack} from '@shm/ui'
import {SiteHead} from '../src/site-head'

export default function ServerErrorPage() {
  return (
    <YStack flex={1}>
      <SiteHead pageTitle="Server Error" />
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
              Oops! Something bad happened in our server.
            </SizableText>
            <SizableText color="$color9" textAlign="center">
              :(
            </SizableText>
          </YStack>
        </PageSection.Content>
        <PageSection.Side />
      </PageSection.Root>
    </YStack>
  )
}
