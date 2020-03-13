import Layout, {LayoutProps} from './layout'
import SeedProvider from '../shared/seedContext'
// import {useRouter, NextRouter} from 'next/router'
// import {useEffect, useState} from 'react'

export default function WelcomeLayout({
  children,
  className = '',
  ...props
}: LayoutProps) {
  return (
    <Layout
      {...props}
      className={`bg-gray-100 flex flex-col py-8 ${className}`}
    >
      {/* <WelcomeProgress router={router} /> */}
      <SeedProvider>{children}</SeedProvider>
    </Layout>
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
