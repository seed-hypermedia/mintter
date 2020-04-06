// import {useEffect} from 'react'

import Layout, {LayoutProps} from './layout'
import WelcomeProvider from '../shared/welcomeProvider'
import {useTheme} from '../shared/themeContext'
import ThemeToggle from './themeToggle'

export default function WelcomeLayout({
  children,
  className = '',
  ...props
}: LayoutProps) {
  const {theme, toggleTheme} = useTheme()

  return (
    <Layout
      {...props}
      className={`bg-background flex flex-col py-8 ${className}`}
    >
      <div className="absolute right-0 top-0 p-4">
        <ThemeToggle isDark={theme === 'theme-dark'} toggle={toggleTheme} />
      </div>
      <WelcomeProvider>{children}</WelcomeProvider>
    </Layout>
  )
}
