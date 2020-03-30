// import {useEffect} from 'react'

import Layout, {LayoutProps} from './layout'
import {useRouter} from 'next/router'
import WelcomeProvider from '../shared/welcomeProvider'

export default function WelcomeLayout({
  children,
  className = '',
  ...props
}: LayoutProps) {
  // const router = useRouter()
  const router = useRouter()
  console.log('router', router)

  return (
    <Layout
      {...props}
      className={`bg-background flex flex-col py-8 ${className}`}
    >
      <WelcomeProvider>{children}</WelcomeProvider>
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
