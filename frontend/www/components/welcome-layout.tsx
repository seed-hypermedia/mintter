import Layout, {LayoutProps} from './layout'

export default function WelcomeLayout({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & LayoutProps) {
  return (
    <Layout
      {...props}
      className={`bg-gray-100 flex flex-col py-8 ${className}`}
    >
      {children}
    </Layout>
  )
}
