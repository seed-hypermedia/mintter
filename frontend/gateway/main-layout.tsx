import React, {PropsWithChildren} from 'react'
import Footer from './footer'
import {SiteHead} from './site-head'

type Meta = {
  title: string
  description?: string
  titleAppendSitename?: boolean
  url: string
  ogImage?: string
}

export function MainLayout({children, meta}: PropsWithChildren<{meta: Meta}>) {
  let {title} = meta
  return (
    <>
      <SiteHead />
      <main
        id="main-content"
        tabIndex={-1}
        className="main-content wrapper text-size-100"
      >
        <article className="flow">
          <h1>{title}</h1>
          {children}
        </article>
      </main>
      <Footer />
    </>
  )
}
