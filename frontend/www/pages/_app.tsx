import React from 'react'
import {AppProps} from 'next/app'
import {AnimatePresence} from 'framer-motion'
import DefaultLayout from '../components/layout'
import dynamic from 'next/dynamic'

import '../styles/index.css'
import UserProvider from '../shared/userContext'
import {RpcProvider, makeRpcClient} from '../shared/rpc'

const NoSSR: React.FC = ({children}) => {
  return <React.Fragment>{children}</React.Fragment>
}

const Dynamic = dynamic(() => Promise.resolve(NoSSR), {ssr: false})

// TODO: Think if there's a better way  to disable SSR, so that access to localStorage doesn't blow up the whole app.
export default function App({
  Component,
  pageProps,
  router,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
AppProps & {Component: any}) {
  const Layout = Component.Layout || DefaultLayout
  return (
    <Dynamic>
      <RpcProvider value={makeRpcClient()}>
        <UserProvider>
          <AnimatePresence exitBeforeEnter>
            {router.pathname.startsWith('/welcome') ? (
              <Layout {...pageProps}>
                <Component {...pageProps} key={router.route} />
              </Layout>
            ) : (
              <Component {...pageProps} key={router.route} />
            )}
          </AnimatePresence>
        </UserProvider>
      </RpcProvider>
    </Dynamic>
  )
}
