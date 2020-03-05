import React from 'react'
import Link from '../components/link'
import Seo from '../components/seo'
import Container from '../components/container'
import Layout from '../components/layout'

export default function Home() {
  return (
    <Layout>
      <Seo title="Mintter" />
      <Container>
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to Mintter</h1>
          <Link href="/app/library">
            <a className="py-4 px-5 bg-blue-600 text-white rounded">Open App</a>
          </Link>
          <Link href="/welcome">
            <a className="py-4 px-5 bg-blue-600 text-white rounded m-4">
              welcome
            </a>
          </Link>
        </div>
      </Container>
    </Layout>
  )
}
