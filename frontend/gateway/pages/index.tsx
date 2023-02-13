import {getLocalWebSiteClient} from '@mintter/shared'
import {transport} from '../client'
import {Publication} from '@mintter/shared'
import {GetServerSideProps} from 'next'
import PublicationPage from '../ssr-publication-page'

function DefaultHomePage() {
  return (
    <>
      <h1>Welcome.</h1>
      <h2>
        This is the default home page. You haven&apos;t published anything here.
      </h2>
    </>
  )
}

export default function HomePage({
  publication,
}: {
  publication?: Publication | null
}) {
  if (!publication) return <DefaultHomePage />
  return <PublicationPage publication={publication} />
}

async function getHomePublication(): Promise<Publication | null> {
  const site = getLocalWebSiteClient(transport)
  try {
    const pathRecord = await site.getPath({path: '/'})
    const publication = pathRecord.publication
    return publication || null
  } catch (e) {
    return null
  }
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const publication = await getHomePublication()
  return {
    props: {
      publication: publication?.toJson(),
    },
  }
}
