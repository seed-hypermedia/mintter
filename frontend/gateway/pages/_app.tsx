import '../styles/global.css'
import '../styles/cube.css'
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'
import {Hydrate, QueryClient, QueryClientProvider} from '@tanstack/react-query'

import type {AppProps} from 'next/app'
import {useState} from 'react'

export default function App({Component, pageProps}: AppProps) {
  let [client] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={client}>
      <Hydrate state={pageProps.dehydratedState}>
        <Component {...pageProps} />
      </Hydrate>
      <ReactQueryDevtools />
    </QueryClientProvider>
  )
}
