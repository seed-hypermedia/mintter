import Layout from './layout'

export default function WelcomeLayout({
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return <Layout className="bg-gray-800 flex flex-col">{children}</Layout>
}
