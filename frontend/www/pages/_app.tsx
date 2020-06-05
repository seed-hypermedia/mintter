import React from 'react'
import {AppProps} from 'next/app'
import dynamic from 'next/dynamic'
import {App} from 'screens/app'

import '../styles/index.css'

const NoSSR: React.FC = ({children}) => {
  return <React.Fragment>{children}</React.Fragment>
}

const Dynamic = dynamic(() => Promise.resolve(NoSSR), {ssr: false})

// TODO: Think if there's a better way  to disable SSR, so that access to localStorage doesn't blow up the whole app.
export default function Root({
  pageProps,
  router,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
AppProps & {Component: any}) {
  return (
    <Dynamic>
      <App {...pageProps} />
    </Dynamic>
  )
}
