import Seo from './seo'
import Layout from './layout'
import LibraryHeader from './library-header'
import Container from './container'
import Content from './content'

export function LibraryLayout({children, title}) {
  return (
    <Layout className="flex flex-col">
      <Seo title={title} />
      <LibraryHeader />
      <div className="flex-1 overflow-y-auto">
        <Container>
          <div className="p-5 flex items-center justify-between">
            <h1 className="text-4xl font-bold text-heading">Library</h1>
          </div>
          {children}
        </Container>
      </div>
    </Layout>
  )
}
