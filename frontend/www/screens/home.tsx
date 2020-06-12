import Container from 'components/container'
import Layout from 'components/layout'
import Heading from 'components/heading'
import {Link} from 'components/link'

export function Home() {
  return (
    <Layout>
      <Container>
        <div className="flex flex-col items-center justify-center pt-8">
          <Heading as="h1">Mintter</Heading>

          {/* TODO: remove this soon */}
          <h4>flows:</h4>
          <div className="flex p-4">
            <Link to="/welcome" className="rounded text-blue-700 text-lg mr-4">
              Welcome
            </Link>
            <Link to="/library/feed" className="rounded text-blue-700 text-lg">
              App
            </Link>
          </div>
        </div>
      </Container>
    </Layout>
  )
}
