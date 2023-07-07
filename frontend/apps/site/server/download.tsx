import {Container, XStack, H1, Button, MainContainer} from '@mintter/ui'
import {SiteHead} from 'site-head'
import Footer from '../footer'

export default function DownloadPage({
  manifest = null,
}: {
  manifest: {platforms: Array<{url: string; platform: string}>} | null
}) {
  return (
    <Container>
      <SiteHead title="Download Mintter" />
      <MainContainer>
        <H1>Download Mintter</H1>
        <XStack space marginVertical="$7">
          {manifest?.platforms.map((item, i) => (
            <Button
              tag="a"
              key={`${item.url}-${i}`}
              href={item.url}
              download
              size="$6"
            >
              {item.platform}
            </Button>
          ))}
        </XStack>
      </MainContainer>
      <Footer />
    </Container>
  )
}

export async function getStaticProps(context) {
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
          //@ts-expect-error
          url: value.url,
        })),
      },
    },
  }
}
