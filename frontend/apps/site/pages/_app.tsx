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

import Head from 'next/head'
import React, {startTransition} from 'react'
import type {AppProps} from 'next/app'
import {useMemo, useState} from 'react'
import {trpc} from '../trpc'
import {TamaguiProvider, TamaguiProviderProps, Theme} from '@mintter/ui'
import tamaguiConfig from 'tamagui.config'

export default trpc.withTRPC(App)

const isMintterSite = process.env.GW_NEXT_HOST === 'https://mintter.com'
const hostIconPrefix = isMintterSite ? '/mintter-icon' : '/generic-icon'

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
      <StyleProvider defaultTheme={theme}>{children}</StyleProvider>
    </NextThemeProvider>
  )
}

function StyleProvider({
  children,
  defaultTheme = 'light',
  ...rest
}: Omit<TamaguiProviderProps, 'config'>) {
  return (
    <TamaguiProvider config={tamaguiConfig} {...rest}>
      <Theme name="blue">{children}</Theme>
    </TamaguiProvider>
  )
}
