import Container from '../components/container'
import Content from '../components/content'
import Seo from '../components/seo'
import Sidebar from '../components/sidebar'
import Layout from '../components/layout'

export default function Library() {
  return (
    <Layout>
      <Seo title="Metrics | Mintter" />
      <Sidebar />
      <div className="flex-1 overflow-y-auto px-8 py-10 lg:px-10 lg:py-12">
        <Container>
          <div>
            <h1 className="p-5 text-4xl font-bold text-heading">Metrics</h1>
          </div>
          <Content>
            <p className="text-body">WIP.</p>
          </Content>
        </Container>
      </div>
    </Layout>
  )
}
