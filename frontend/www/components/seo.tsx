import React from 'react'
import {Helmet} from 'react-helmet'

// TODO: implement Seo with hoofd
interface SeoProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  image?: string
  locale?: string
  localeAlternate?: string
  children?: any
}

interface SiteTags {
  title: string
  description: string
  twitterCard: string
  locale: string
  localeAlternate: string
}

const dataTags: {[name: string]: SiteTags} = {
  'opinion.ethosfera.org': {
    title: 'Ethosfera',
    description:
      '“El humano perfecto es el mejor de los animales, así también, apartado de la ley y la justicia, es el peor de todos.”Aristóteles Somos un think tank español creado en 2020 con un propósito: Catalizar la virtud privada al servicio del interés público y combatir los riesgos que amenazan nuestra democracia en la era digital [&hellip;]',
    twitterCard: 'summary_large_image',
    locale: 'es_ES',
    localeAlternate: 'en_GB',
  },
  'alicearticles.com': {
    title: 'Alice Articles at Mintter',
    description:
      'Alice Articles. This is a Demo Node for the new Publishing platform Mintter. learn more at https://mintter.com',
    twitterCard: 'summary_large_image',
    locale: 'es_ES',
    localeAlternate: 'en_GB',
  },
  localhost: {
    title: 'Mintter',
    description:
      'Mintter is a peer-to-peer collaborative publishing platform. Authors create and distribute content via direct person-to-person connections without any central servers. It is a new distribution channel that you control without gatekeepers.',
    locale: 'en_US',
    twitterCard: 'summary_large_image',
    localeAlternate: 'en_GB',
  },
}

export default function Seo({children, ...props}: SeoProps) {
  const meta = dataTags[window.location.hostname] || dataTags.localhost
  const {
    title,
    description = meta.description,
    locale = meta.locale,
    localeAlternate = meta.localeAlternate,
  } = props
  return (
    <Helmet>
      <title>{`${title ? title : meta.title} | ${meta.title}`}</title>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        key="viewport"
      />
      <link rel="icon" href="/favicon.ico" key="favicon" />
      <meta
        property="og:title"
        content={`${title ? title : meta.title} | ${meta.title}`}
        key="title"
      />
      <meta
        property="og:description"
        content={description ? description : meta.description}
        key="description"
      />
      <meta property="og:locale" content={locale} key="locale" />
      <meta
        property="og:locale:alternate"
        content={localeAlternate}
        key="localeAlt"
      />
      {/* <meta
        property="og:image"
        content="http://euro-travel-example.com/thumbnail.jpg"
      /> */}
      <meta property="og:url" content={window.location.href} />
      <meta name="twitter:card" content="summary_large_image" />

      <meta property="og:site_name" content={meta.title} />
      {children}
    </Helmet>
  )
}
