import Link from 'next/link'

export function SiteHead({
  siteTitle = 'A Mintter-powered site',
}: {
  title?: string
  siteTitle: string | null
}) {
  return (
    <header className="site-head with-border" role="banner">
      <div className="wrapper">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <div className="site-head__inner">
          <Link href="/" aria-label="home page">
            <h1>{siteTitle}</h1>
          </Link>
        </div>
      </div>
    </header>
  )
}
