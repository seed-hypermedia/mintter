import React, {PropsWithChildren} from 'react'
import Footer from './footer'

type Meta = {
  title: string
  description?: string
  titleAppendSitename?: boolean
  url: string
  ogImage?: string
}

export function MainLayout({children, meta}: PropsWithChildren<{meta: Meta}>) {
  const {title} = meta || {}

  return (
    <>
      <div className="min-h-screen min-w-screen px-8 md:px-12 pt-12">
        <div className="max-w-custom w-full pt-8 m-auto prose xs:prose-lg lg:prose-xl 2xl:prose-2xl pb-16">
          <img
            className="w-full"
            style={{height: '100px', width: 'auto'}}
            src="/web-logo.png"
          />
          <h1 className="m-0 p-0 mt-4" style={{fontSize: '2.2em'}}>
            {title}
          </h1>
          {children}
          <Footer />
        </div>
      </div>
    </>
  )
}
