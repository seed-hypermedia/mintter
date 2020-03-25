// import {useEffect} from 'react'

import Layout, {LayoutProps} from './layout'
// import {useRouter} from 'next/router'
import WelcomeProvider from '../shared/welcomeProvider'
import {useTheme} from '../shared/themeContext'
// import {useProfile} from '../shared/profileContext'
import ThemeToggle from './themeToggle'

export default function WelcomeLayout({
  children,
  className = '',
  ...props
}: LayoutProps) {
  const {theme, toggleTheme} = useTheme()
  // const router = useRouter()

  async function checkProfile() {}

  return (
    <div className={theme}>
      <Layout
        {...props}
        className={`content-transition bg-background flex flex-col py-8 ${className}`}
      >
        <div className="absolute right-0 top-0 p-4">
          <ThemeToggle isDark={theme === 'theme-dark'} toggle={toggleTheme} />
        </div>

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
