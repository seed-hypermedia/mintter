import {Fragment} from 'react'
// import Link from '../../components/link'
import Container from '../../components/container'
import Seo from '../../components/seo'
import Sidebar from '../../components/sidebar'
import Layout from '../../components/layout'

export default function Library() {
  return (
    <Layout>
      <Seo title="Editor | Mintter" />
      <Sidebar />
      <div className="flex-1 overflow-y-auto px-8 py-10 lg:px-10 lg:py-12">
        <Container>
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-5">Metrics</h1>
          </div>
          <p>WIP.</p>
        </Container>
      </div>
    </Layout>
  )
}
