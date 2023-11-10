import {
  AppleIcon,
  Button,
  LinuxIcon,
  PageSection,
  SizableText,
  View,
  WindowsIcon,
  XStack,
  YStack,
  Group,
} from '@mintter/ui'
import {SiteHead} from 'src/site-head'
import {EveryPageProps} from './_app'
import {GetStaticProps} from 'next'
import {getPageProps} from 'server/ssr-helpers'
import {getSiteServerHelpers} from 'server/static-props'

export default function DownloadPage(props: any) {
  return (
    <>
      <SiteHead pageTitle={`Download Mintter ${props.versionName}`} />
      <PageSection.Root>
        <PageSection.Side />
        <PageSection.Content tag="main" id="main-content" tabIndex={-1}>
          <YStack paddingHorizontal="$4" $gtMd={{paddingHorizontal: '$5'}}>
            <SizableText size="$8" fontWeight="bold">
              Download Mintter
            </SizableText>
            <SizableText size="$6" fontWeight="bold" opacity={0.6}>
              {props.versionName}
            </SizableText>
            <SizableText tag="a" target="_blank" href={props.releaseUrl}>
              Release Notes
            </SizableText>
            <XStack
              marginVertical="$7"
              flexWrap="wrap"
              gap="$2"
              $gtMd={{gap: '$4', flexDirection: 'row'}}
              flexDirection="column"
            >
              {props.manifest.macos && (
                <PlarformSection
                  platform={props.manifest.macos}
                  icon={<AppleIcon width={44} height={44} />}
                />
              )}
              {props.manifest.windows && (
                <PlarformSection
                  platform={props.manifest.windows}
                  icon={<WindowsIcon width={44} height={44} />}
                />
              )}
              {props.manifest.linux && (
                <PlarformSection
                  platform={props.manifest.linux}
                  icon={<LinuxIcon width={44} height={44} />}
                />
              )}
            </XStack>
          </YStack>
        </PageSection.Content>
        <PageSection.Side />
      </PageSection.Root>
    </>
  )
}

function PlarformSection({
  platform,
  icon,
}: {
  platform: {items: Array<{name: string; downloadUrl: string}>; name: string}
  icon: any
}) {
  return (
    <View flex={1} flexDirection="column">
      <YStack
        padding="$4"
        alignItems="center"
        gap="$4"
        elevation={1}
        borderWidth={1}
        borderColor="$color6"
        borderRadius="$3"
      >
        <SizableText fontWeight="bold" size="$5">
          {platform.name}
        </SizableText>
        {icon}
        <Group orientation="horizontal">
          {platform.items.map((item) => (
            <Group.Item key={item.name}>
              <Button
                tag="a"
                theme="mint"
                href={item.downloadUrl}
                download
                size="$2"
              >
                {item.name}
              </Button>
            </Group.Item>
          ))}
        </Group>
      </YStack>
    </View>
  )
}

function extractedAsset(
  name: string,
  asset: {url: string; browser_download_url: string},
) {
  return {name, downloadUrl: asset.browser_download_url}
}
export const getStaticProps: GetStaticProps<EveryPageProps> = async (
  context,
) => {
  let req = await fetch(
    `https://api.github.com/repos/mintterhypermedia/mintter/releases/latest`,
  )

  let manifest = await req.json()
  const {helpers} = await getSiteServerHelpers()

  // console.log(`== ~ getStaticProps ~ manifest:`, manifest)

  // example manifest.assets[].name:
  //  Mintter-2023.10.2-full.nupkg
  //  mintter-2023.10.2-win32-x64-setup.exe
  //  Mintter-darwin-x64-2023.10.2.zip
  //  Mintter-darwin-arm64-2023.10.2.zip
  //  mintter-desktop_2023.10.2_amd64.deb

  const macOSarm64 = manifest.assets.find((asset: {name: string}) =>
    asset.name.match(/darwin-arm64/),
  )
  const macOSx64 = manifest.assets.find((asset: {name: string}) =>
    asset.name.match(/darwin-x64/),
  )
  const win32x64 = manifest.assets.find((asset: {name: string}) =>
    asset.name.match(/win32-x64/),
  )
  const linuxx64 = manifest.assets.find((asset: {name: string}) =>
    asset.name.match(/amd64.deb/),
  )

  return {
    revalidate: 200, // update this every 200 seconds
    props: await getPageProps(helpers, context, {
      versionName: manifest.name,
      releaseUrl: `https://github.com/MintterHypermedia/mintter/releases/tag/${manifest.tag_name}`,
      publishedAt: manifest.published_at,
      notes: manifest.body,
      manifest: {
        macos: {
          name: 'Apple',
          items: [
            extractedAsset('arm64', macOSarm64),
            extractedAsset('x64', macOSx64),
          ],
        },
        windows: {
          name: 'Windows',
          items: [extractedAsset('x64', win32x64)],
        },
        linux: {
          name: 'Linux',
          items: [extractedAsset('.deb', linuxx64)],
        },
      },
    }),
  }
}
