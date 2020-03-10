import React, {useContext, useState, useEffect} from 'react'
import Link from '../components/link'
import Seo from '../components/seo'
import Container from '../components/container'
import Layout from '../components/layout'
import Heading from '../components/heading'
import {RpcContext} from '../shared/rpc'
import {GenSeedRequest} from '@mintter/proto/mintter_pb'

const GrpcTest = () => {
  const rpc = useContext(RpcContext)
  const [data, setData] = useState<{mnemonic: String[]}>({mnemonic: []})

  useEffect(() => {
    const fetchData = async () => {
      const req = new GenSeedRequest()
      req.setAezeedPassphrase('test')

      try {
        const resp = await rpc.accounts.genSeed(req)
        setData({mnemonic: resp.getMnemonicList()})
      } catch (err) {
        throw err
      }
    }

    fetchData()
  })

  return (
    <React.Fragment>
      <h4>Testing gRPC</h4>
      <div>
        <p>{data.mnemonic.join(' ')}</p>
      </div>
    </React.Fragment>
  )
}

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
            <Link href="/app/library" className="rounded text-blue-700 text-lg">
              App
            </Link>
          </div>

          <GrpcTest />
        </div>
      </Container>
    </Layout>
  )
}
