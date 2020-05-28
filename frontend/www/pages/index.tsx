import React from 'react'
import Link from '../components/link'
import Seo from '../components/seo'
import Container from '../components/container'
import Layout from '../components/layout'
import Heading from '../components/heading'

export default function Home() {
  return (
    <Layout>
      <Seo title="Mintter" />
      <Container>
        <div className="flex flex-col items-center justify-center pt-8">
          <Heading as="h1">Mintter</Heading>

          {/* TODO: remove this soon */}
          <h4>flows:</h4>
          <div className="flex p-4">
            <Link
              href="/welcome"
              className="rounded text-blue-700 text-lg mr-4"
            >
              Welcome
            </Link>
            <Link href="/drafts" className="rounded text-blue-700 text-lg">
              App
            </Link>
          </div>
        </div>
      </Container>
    </Layout>
  )
}
