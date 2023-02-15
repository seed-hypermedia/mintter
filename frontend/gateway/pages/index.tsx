import {
  getLocalWebSiteClient,
  getPublication,
  Publication,
} from '@mintter/shared'
import {GetServerSideProps} from 'next'
import {transport} from '../client'
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
  return <PublicationPage publication={publication} metadata={false} />
}

async function getHomePublication(): Promise<Publication | null> {
  const site = getLocalWebSiteClient(transport)
  try {
    const pathRecord = await site.getPath({path: '/'})
    const publication = pathRecord?.publication
    return publication || null
  } catch (e) {
    return null
  }
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // mintter://bafy2bzacedq36zy5yrhutg5pocnpv2lzxr6xwfs6eeng7saoe7syxkeiq3zsm/baeaxdiheaiqjrcwamuudzuc7vmzfnebn6xs45fcbgorb4vfkc44aehc3eevt25q
  const publication = await getPublication(
    'bafy2bzacedq36zy5yrhutg5pocnpv2lzxr6xwfs6eeng7saoe7syxkeiq3zsm',
    'baeaxdiheaiqjrcwamuudzuc7vmzfnebn6xs45fcbgorb4vfkc44aehc3eevt25q',
    transport,
  )
  // const publication = await getHomePublication()
  return {
    props: {
      publication: publication?.toJson(),
    },
  }
}
