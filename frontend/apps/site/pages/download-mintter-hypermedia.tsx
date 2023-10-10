import {Button, Heading, MainWrapper, PageSection, XStack} from '@mintter/ui'
import {SiteHead} from 'site-head'
import {relativeFormattedDate} from '@mintter/shared'

function DownloadButton({
  item,
  label,
}: {
  item: {downloadUrl: string}
  label: string
}) {
  return (
    <Button tag="a" href={item.downloadUrl} download size="$6">
      {label}
    </Button>
  )
}

export default function DownloadPage(props: any) {
  return (
    <MainWrapper>
      <SiteHead pageTitle={`Download Mintter ${props.versionName}`} />
      <PageSection.Root>
        <PageSection.Side />
        <PageSection.Content tag="main" id="main-content" tabIndex={-1}>
          <Heading size="$3">
            Released{' '}
            {relativeFormattedDate(new Date(props.publishedAt), {
              onlyRelative: true,
            })}
          </Heading>

          {/* <pre>{JSON.stringify(props)}</pre> */}
          <XStack space marginVertical="$7" alignSelf="stretch">
            {props.manifest.macOSarm64 && (
              <DownloadButton
                item={props.manifest.macOSarm64}
                label="MacOS (Apple Silicon)"
              />
            )}
            {props.manifest.macOSx64 && (
              <DownloadButton
                item={props.manifest.macOSx64}
                label="MacOS (Intel)"
              />
            )}
            {props.manifest.win32x64 && (
              <DownloadButton
                item={props.manifest.win32x64}
                label="Windows (64-bit)"
              />
            )}
            {props.manifest.linuxx64 && (
              <DownloadButton
                item={props.manifest.linuxx64}
                label="Linux (64-bit)"
              />
            )}
          </XStack>
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
