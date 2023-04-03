// import '@tamagui/core/reset.css'
// import '@tamagui/font-inter/css/400.css'
// import '@tamagui/font-inter/css/700.css'

if (typeof globalThis.EdgeRuntime !== 'string') {
  console.log('I"M IN THE EDGE!', globalThis.setImmediate, global.setImmediate)
}
if (!global.setImmediate || !globalThis['setImmediate']) {
  //@ts-ignore
  global.setImmediate = setTimeout
  //@ts-ignore
  globalThis['setImmediate'] = setTimeout
}

import '@tamagui/core/reset.css'
import '@tamagui/font-inter/css/400.css'
import '@tamagui/font-inter/css/700.css'
import 'raf/polyfill'

import {Hydrate, QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'
import {NextThemeProvider, useRootTheme} from '@tamagui/next-theme'
import {Provider} from '@mintter/ui'
import Head from 'next/head'
import React, {startTransition} from 'react'
import type {AppProps} from 'next/app'
import {useMemo, useState} from 'react'
import {trpc} from '../trpc'

export default trpc.withTRPC(App)

function App({Component, pageProps}: AppProps) {
  let [client] = useState(() => new QueryClient())

  // memo to avoid re-render on dark/light change
  const contents = useMemo(() => {
    return <Component {...pageProps} />
  }, [pageProps])

  return (
    <QueryClientProvider client={client}>
      <Head>
        <link
          rel="apple-touch-icon-precomposed"
          sizes="57x57"
          href="/apple-touch-icon-57x57.png"
        />
        <link
          rel="apple-touch-icon-precomposed"
          sizes="114x114"
          href="/apple-touch-icon-114x114.png"
        />
        <link
          rel="apple-touch-icon-precomposed"
          sizes="72x72"
          href="/apple-touch-icon-72x72.png"
        />
        <link
          rel="apple-touch-icon-precomposed"
          sizes="144x144"
          href="/apple-touch-icon-144x144.png"
        />
        <link
          rel="apple-touch-icon-precomposed"
          sizes="60x60"
          href="/apple-touch-icon-60x60.png"
        />
        <link
          rel="apple-touch-icon-precomposed"
          sizes="120x120"
          href="/apple-touch-icon-120x120.png"
        />
        <link
          rel="apple-touch-icon-precomposed"
          sizes="76x76"
          href="/apple-touch-icon-76x76.png"
        />
        <link
          rel="apple-touch-icon-precomposed"
          sizes="152x152"
          href="/apple-touch-icon-152x152.png"
        />
        <link
          rel="icon"
          type="image/png"
          href="/favicon-196x196.png"
          sizes="196x196"
        />
        <link
          rel="icon"
          type="image/png"
          href="/favicon-96x96.png"
          sizes="96x96"
        />
        <link
          rel="icon"
          type="image/png"
          href="/favicon-32x32.png"
          sizes="32x32"
        />
        <link
          rel="icon"
          type="image/png"
          href="/favicon-16x16.png"
          sizes="16x16"
        />
        <link
          rel="icon"
          type="image/png"
          href="/favicon-128.png"
          sizes="128x128"
        />
        <meta name="application-name" content="&nbsp;" />
        <meta name="msapplication-TileColor" content="#FFFFFF" />
        <meta name="msapplication-TileImage" content="mstile-144x144.png" />
        <meta name="msapplication-square70x70logo" content="mstile-70x70.png" />
        <meta
          name="msapplication-square150x150logo"
          content="mstile-150x150.png"
        />
        <meta
          name="msapplication-wide310x150logo"
          content="mstile-310x150.png"
        />
        <meta
          name="msapplication-square310x310logo"
          content="mstile-310x310.png"
        />
        <script
          key="tamagui-animations-mount"
          dangerouslySetInnerHTML={{
            // avoid flash of animated things on enter
            __html: `document.documentElement.classList.add('t_unmounted')`,
          }}
        />
      </Head>
      <Hydrate state={pageProps.dehydratedState}>
        <ThemeProvider>{contents}</ThemeProvider>
      </Hydrate>
      <ReactQueryDevtools />
    </QueryClientProvider>
  )
}

function ThemeProvider({children}: {children: React.ReactNode}) {
  const [theme, setTheme] = useRootTheme()

  return (
    <NextThemeProvider
      onChangeTheme={(next) => {
        startTransition(() => {
          setTheme(next)
        })
      }}
    >
      <Provider disableRootThemeClass defaultTheme={theme}>
        {children}
      </Provider>
    </NextThemeProvider>
  )
}
