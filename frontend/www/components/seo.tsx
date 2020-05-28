import React from 'react'
import Head from 'next/head'

interface SeoProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
}

export default function Seo({title}: SeoProps) {
  return (
    <Head>
      <title>{`${title}${title ? ' | ' : ''}Mintter`}</title>
      <link rel="icon" href="/favicon.ico" />
    </Head>
  )
}
