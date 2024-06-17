import '@tamagui/core/reset.css'
import '@tamagui/font-inter/css/400.css'
import '@tamagui/font-inter/css/700.css'
import 'raf/polyfill'
import '../styles/styles.css'

if (!global.setImmediate || !globalThis['setImmediate']) {
  //@ts-ignore
  global.setImmediate = setTimeout
  //@ts-ignore
  globalThis['setImmediate'] = setTimeout
}

import {NextThemeProvider, useRootTheme} from '@tamagui/next-theme'
import {
  DehydratedState,
  Hydrate,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import {ReactQueryDevtools} from '@tanstack/react-query-devtools'

import {TamaguiProvider, Toaster} from '@shm/ui'
import type {AppProps} from 'next/app'
import Head from 'next/head'
import React, {startTransition, useMemo, useState} from 'react'
import {trpc} from '../src/trpc'
import tamaguiConfig from '../tamagui.config'

if (process.env.NODE_ENV === 'production') {
  require('../public/tamagui.css')
}

export default trpc.withTRPC(App)

const isMintterSite = process.env.HM_BASE_URL === 'https://mintter.com'
const hostIconPrefix = isMintterSite ? '/mintter-icon' : '/generic-icon'

export type EveryPageProps = {
  trpcState?: DehydratedState
}

function App({Component, pageProps}: AppProps<EveryPageProps>) {
  let [client] = useState(() => new QueryClient())

  // memo to avoid re-render on dark/light change
  const contents = useMemo(() => {
    return <Component {...pageProps} />
  }, [Component, pageProps])

  return (
    <QueryClientProvider client={client}>
      <Head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href={`${hostIconPrefix}/apple-touch-icon.png`}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href={`${hostIconPrefix}/favicon-32x32.png`}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href={`${hostIconPrefix}/favicon-16x16.png`}
        />
        <meta name="theme-color" content="#ffffff" />
        <meta name="application-name" content="&nbsp;" />
        <meta name="msapplication-TileColor" content="#FFFFFF" />
        <meta
          name="msapplication-TileImage"
          content={`${hostIconPrefix}/mstile-150x150.png`}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script
          key="tamagui-animations-mount"
          dangerouslySetInnerHTML={{
            // avoid flash of animated things on enter
            __html: `document.documentElement.classList.add('t_unmounted')`,
          }}
        />
      </Head>
      <Hydrate state={pageProps.trpcState}>
        <ThemeProvider>
          {contents}
          <Toaster />
        </ThemeProvider>
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
          if (next === 'dark') setTheme('dark')
          else if (next === 'light') setTheme('light')
        })
      }}
    >
      <TamaguiProvider
        config={tamaguiConfig}
        defaultTheme={theme}
        disableRootThemeClass
        disableInjectCSS
      >
        {children}
      </TamaguiProvider>
    </NextThemeProvider>
  )
}
