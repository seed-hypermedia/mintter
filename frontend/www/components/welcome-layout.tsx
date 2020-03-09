import Layout, {LayoutProps} from './layout'

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
      {children}
    </Layout>
  )
}
