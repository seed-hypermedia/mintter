import Layout, {LayoutProps} from './layout'

import WelcomeProvider from '../shared/welcomeProvider'
import {useState} from 'react'
// import {useRouter, NextRouter} from 'next/router'
// import {useEffect, useState} from 'react'

export default function WelcomeLayout({
  children,
  className = '',
  ...props
}: LayoutProps) {
  const [theme, setTheme] = useState('theme-light')

  function toggleThemeClass() {
    setTheme(theme === 'theme-light' ? 'theme-dark' : 'theme-light')
  }

  return (
    <div className={theme}>
      <Layout
        {...props}
        className={`content-transition bg-background-primary flex flex-col py-8 ${className}`}
      >
        <button
          onClick={toggleThemeClass}
          className="border absolute right-0 top-0 py-2 px-4"
        >
          theme toggle
        </button>
        <WelcomeProvider>{children}</WelcomeProvider>
      </Layout>
    </div>
  )
}

// function WelcomeProgress({router}: {router: NextRouter}) {
//   const {pathname} = router
//   const [currentStep, setStep] = useState(pathname)

//   useEffect(() => {
//     setStep(pathname)
//   }, [pathname])
//   return (
//     <div className="w-full p-4 bg-gray-300 flex justify-center">
//       <p>{currentStep}</p>
//     </div>
//   )
// }
