if (typeof globalThis.EdgeRuntime !== 'string') {
  console.log('I"M IN THE EDGE!', globalThis.setImmediate, global.setImmediate)
}
if (!global.setImmediate || !globalThis['setImmediate']) {
  //@ts-ignore
  global.setImmediate = setTimeout
  //@ts-ignore
  globalThis['setImmediate'] = setTimeout
}

import {Container} from '../container'
import {XStack, YStack, H1, Button, styled} from 'tamagui'
import Footer from '../footer'
import {GatewayHead} from '../gateway-head'

export default function DownloadPage({manifest = null}) {
  return (
    <>
      <GatewayHead title="Download" />
      <Container>
        <YStack>
          <H1>Download Mintter</H1>
          <XStack space my="$7">
            {manifest?.platforms.map((item) => (
              <DownloadItem key={item.url} href={item.url} download size="$6">
                {item.platform}
              </DownloadItem>
            ))}
          </XStack>
        </YStack>
      </Container>
      <Footer />
    </>
  )
}

const DownloadItem = styled(Button, {})

export async function getStaticProps() {
  let req = await fetch(
    `https://mintternightlies.s3.amazonaws.com/manifest.json`,
  )
  let manifest = await req.json()

  let platforms = {
    'darwin-aarch64': 'Apple (M1)',
    'darwin-x86_64': 'Apple (Intel)',
    'linux-x86_64': 'Linux (AppImage)',
    'windows-x86_64': 'Windows',
  }

  return {
    props: {
      manifest: {
        ...manifest,
        platforms: Object.entries(manifest.platforms).map(([key, value]) => ({
          platform: platforms[key],
          url: value.url,
        })),
      },
    },
  }
}
