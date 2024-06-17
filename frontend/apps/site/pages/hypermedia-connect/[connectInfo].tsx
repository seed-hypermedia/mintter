import {
  ArrowRight,
  ArrowUpRight,
  Button,
  SizableText,
  XStack,
  YStack,
} from '@shm/ui'
import {decompressFromEncodedURIComponent} from 'lz-string'
import Link from 'next/link'
import {useRouter} from 'next/router'
import {useMemo} from 'react'
import {MainSiteLayout} from 'src/site-layout'
import {SiteHead} from '../../src/site-head'

export default function ConnectPeerPage() {
  const router = useRouter()
  const connectInfo = router.query.connectInfo
  const alias = useMemo(() => {
    const encodedConnectInfo = String(connectInfo)
    const connectInfoJSON =
      decompressFromEncodedURIComponent(encodedConnectInfo)
    const info = JSON.parse(connectInfoJSON)
    return info?.n
  }, [connectInfo])
  return (
    <MainSiteLayout head={<SiteHead pageTitle="Connect Hypermedia Peer" />}>
      <YStack
        paddingVertical="$7"
        paddingHorizontal="$5"
        borderRadius="$5"
        marginVertical="$6"
        elevation="$1"
        borderColor="$color5"
        borderWidth={1}
        backgroundColor="$color3"
        gap="$3"
      >
        <SizableText size="$5" fontWeight="800">
          Connect to &quot;{alias}&quot; on Mintter Hypermedia
        </SizableText>
        <SizableText>1. Download the app and set up your account:</SizableText>
        <XStack>
          <Link
            passHref
            href={`/download-mintter-hypermedia`}
            style={{textDecoration: 'none'}}
          >
            <Button tag="a" iconAfter={ArrowRight}>
              Download Mintter Desktop
            </Button>
          </Link>
        </XStack>
        <SizableText>
          2. Click here to launch the app and connect to <b>{alias}</b>:
        </SizableText>
        <XStack>
          <Link
            passHref
            href={`hm://connect/${connectInfo}`}
            style={{textDecoration: 'none'}}
          >
            <Button tag="a" iconAfter={ArrowUpRight}>
              Connect in Mintter
            </Button>
          </Link>
        </XStack>
      </YStack>
    </MainSiteLayout>
  )
}
