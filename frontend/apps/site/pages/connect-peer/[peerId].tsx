import {Button, PageSection, SizableText, YStack} from '@mintter/ui'
import {SiteHead} from '../../site-head'
import Link from 'next/link'
import {useRouter} from 'next/router'

export default function ConnectPeerPage() {
  const router = useRouter()
  const peerId = router.query.peerId
  return (
    <YStack flex={1}>
      <SiteHead pageTitle="Connect Hypermedia Peer" />
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
              Somebody wants to connect with you! First{' '}
              <a href="https://github.com/mintterhypermedia/mintter/releases/latest">
                download the Mintter app
              </a>
              , then press this button to launch it:
            </SizableText>
            <Link passHref href={`hm://connect-peer/${peerId}`}>
              <Button tag="a">Connect in Mintter</Button>
            </Link>
          </YStack>
        </PageSection.Content>
        <PageSection.Side />
      </PageSection.Root>
    </YStack>
  )
}
