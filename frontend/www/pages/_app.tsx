import React from 'react'
import {AppProps} from 'next/app'
import dynamic from 'next/dynamic'
import {App} from 'shared/app'
import {AppProviders} from 'components/app-providers'

import 'styles/index.css'

export function reportWebVitals(metric) {
  console.log('METRIC => ', metric)
}

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
      <AppProviders>
        <App {...pageProps} />
      </AppProviders>
    </Dynamic>
  )
}
