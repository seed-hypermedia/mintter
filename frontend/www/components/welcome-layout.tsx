import Layout, {LayoutProps} from './layout'
import WelcomeProvider from '../shared/welcome-provider'
import ThemeToggle from './theme-toggle'

export default function WelcomeLayout({
  children,
  className = '',
  ...props
}: LayoutProps) {
  return (
    <Layout {...props} className={`flex flex-col py-8 ${className}`}>
      <div className="absolute right-0 top-0 p-4">
        <ThemeToggle />
      </div>
      <WelcomeProvider>{children}</WelcomeProvider>
    </Layout>
  )
}
