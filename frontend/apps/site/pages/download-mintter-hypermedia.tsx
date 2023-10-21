import {relativeFormattedDate} from '@mintter/shared'
import {
  AppleIcon,
  ButtonFrame,
  ButtonText,
  DebianIcon,
  MainWrapper,
  PageSection,
  SizableText,
  Square,
  View,
  WindowsIcon,
  XStack,
  YStack,
} from '@mintter/ui'
import {Touchable, TouchableOpacity} from 'react-native'
import {SiteHead} from 'src/site-head'

function DownloadButton({
  item,
  label,
  icon,
}: {
  item: {downloadUrl: string}
  label: string
  icon: any
}) {
  return (
    <View
      width="100%"
      paddingVertical="$2"
      $gtMd={{
        width: '50%',
        padding: '$2',
      }}
      $gtLg={{
        width: '25%',
      }}
    >
      <ButtonFrame
        flex={1}
        backgroundColor="$mint4"
        overflow="hidden"
        borderRadius="$3"
        hoverStyle={{
          cursor: 'pointer',
          backgroundColor: '$mint6',
        }}
        padding="$4"
        href={item.downloadUrl}
        download
        alignItems="center"
        flexDirection="column"
        gap="$4"
        height="auto"
      >
        {icon}
        <SizableText>{label}</SizableText>
      </ButtonFrame>
    </View>
  )
}

export default function DownloadPage(props: any) {
  return (
    <MainWrapper>
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
            <XStack marginVertical="$7" flexWrap="wrap">
              {props.manifest.macOSarm64 && (
                <DownloadButton
                  item={props.manifest.macOSarm64}
                  label="Apple Silicon"
                  icon={<AppleIcon width={32} height={32} />}
                />
              )}
              {props.manifest.macOSx64 && (
                <DownloadButton
                  item={props.manifest.macOSx64}
                  label="Intel"
                  icon={<AppleIcon width={32} height={32} />}
                />
              )}
              {props.manifest.win32x64 && (
                <DownloadButton
                  item={props.manifest.win32x64}
                  label="Windows (x64)"
                  icon={<WindowsIcon width={32} height={32} />}
                />
              )}
              {props.manifest.linuxx64 && (
                <DownloadButton
                  item={props.manifest.linuxx64}
                  label="Debian (x64)"
                  icon={<DebianIcon width={32} height={32} />}
                />
              )}
            </XStack>
            {/* <YStack>
              <SizableText size="$6" fontWeight="bold">
                {props.versionName}
              </SizableText>
              <SizableText>You can see the release notes here</SizableText>
            </YStack> */}
          </YStack>
        </PageSection.Content>
        <PageSection.Side />
      </PageSection.Root>
    </MainWrapper>
  )
}
function extractedAsset(asset: {url: string; browser_download_url: string}) {
  return {downloadUrl: asset.browser_download_url}
}
export async function getStaticProps() {
  let req = await fetch(
    `https://api.github.com/repos/mintterhypermedia/mintter/releases/latest`,
  )
  let manifest = await req.json()
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
  console.log(manifest)
  return {
    revalidate: 200, // update this every 200 seconds
    props: {
      versionName: manifest.name,
      releaseUrl: `https://github.com/MintterHypermedia/mintter/releases/tag/${manifest.tag_name}`,
      publishedAt: manifest.published_at,
      notes: manifest.body,
      manifest: {
        macOSarm64: extractedAsset(macOSarm64),
        macOSx64: extractedAsset(macOSx64),
        win32x64: extractedAsset(win32x64),
        linuxx64: extractedAsset(linuxx64),
      },
    },
  }
}
