import React from 'react'
import {AppProps} from 'next/app'
import {AnimatePresence} from 'framer-motion'

import dynamic from 'next/dynamic'

import '../styles/index.css'
import UserProvider from '../shared/userContext'

const NoSSR: React.FC = ({children}) => {
  return <React.Fragment>{children}</React.Fragment>
}

const Dynamic = dynamic(() => Promise.resolve(NoSSR), {ssr: false})

// TODO: Think if there's a better way  to disable SSR, so that access to localStorage doesn't blow up the whole app.
export default function App({Component, pageProps, router}: AppProps) {
  return (
    <Dynamic>
      <UserProvider>
        <AnimatePresence exitBeforeEnter>
          <Component {...pageProps} key={router.route} />
        </AnimatePresence>
      </UserProvider>
    </Dynamic>
  )
}
