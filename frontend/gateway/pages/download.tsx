import Footer from '../footer'
import {SiteHead} from '../site-head'

export default function DownloadPage({manifest = null}) {
  return (
    <>
      <SiteHead />
      <main
        id="main-content"
        tabIndex={-1}
        className="main-content wrapper text-size-1"
      >
        <section>
          <h1>Download Mintter</h1>
          <div className="cluster">
            {manifest?.platforms.map((item) => (
              <a
                key={item.url}
                className="download-item"
                href={item.url}
                download
              >
                {item.platform}
              </a>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

export async function getServerSideProps() {
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
