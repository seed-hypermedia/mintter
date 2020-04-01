// import {useEffect} from 'react'

import Layout, {LayoutProps} from './layout'
import {useRouter} from 'next/router'
import WelcomeProvider from '../shared/welcomeProvider'

export default function WelcomeLayout({
  children,
  className = '',
  ...props
}: LayoutProps) {
  const router = useRouter()

  return (
    <Layout
      {...props}
      className={`bg-background flex flex-col py-8 ${className}`}
    >
      <WelcomeProvider>{children}</WelcomeProvider>
    </Layout>
  )
}
