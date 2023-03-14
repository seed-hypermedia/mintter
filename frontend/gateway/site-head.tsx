import {SiteInfo} from '@mintter/shared'
import Head from 'next/head'
import Link from 'next/link'

const SITE_NAME = process.env.GW_SITE_NAME || 'Mintter Site'

export function SiteHead({
  siteInfo,
  title,
}: {
  siteInfo: SiteInfo | null
  title?: string
}) {
  return (
    <header className="site-head with-border" role="banner">
      <Head>
        <title>{title || siteInfo?.title || SITE_NAME}</title>
        {siteInfo?.description && (
          <meta name="description" content={siteInfo?.description} />
        )}
      </Head>
      <div className="wrapper">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <div className="site-head__inner">
          <Link href="/" aria-label="home page">
            <h1>{siteInfo?.title || 'A Mintter-powered site'}</h1>
          </Link>
        </div>
      </div>
    </header>
  )
}
