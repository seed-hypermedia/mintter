import React from 'react'
import Head from 'next/head'

interface SeoProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
}

export default function Seo({title = 'Mintter'}: SeoProps) {
  return (
    <Head>
      <title>{title}</title>
      <link rel="icon" href="/favicon.ico" />
    </Head>
  )
}
