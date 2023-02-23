import {
  getLocalWebSiteClient,
  getPublication,
  Publication,
} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {GetServerSideProps} from 'next'
import {transport} from '../client'
import {PublicationPlaceholder} from '../publication-placeholder'
import {SiteHead} from '../site-head'
import PublicationPage from '../ssr-publication-page'

function DefaultHomePage() {
  let {data} = useQuery({
    queryKey: [
      'pub',
      'bafy2bzacedq36zy5yrhutg5pocnpv2lzxr6xwfs6eeng7saoe7syxkeiq3zsm',
      'baeaxdiheaiqnlfxtkzqobiqcsrwh6kncz2qeowqmwnjjbokmczxuxyimg6r7dta',
    ],
    queryFn: () =>
      getPublication(
        'bafy2bzacedq36zy5yrhutg5pocnpv2lzxr6xwfs6eeng7saoe7syxkeiq3zsm',
        'baeaxdiheaiqnlfxtkzqobiqcsrwh6kncz2qeowqmwnjjbokmczxuxyimg6r7dta',
        transport,
      ),
  })
  if (data) {
    return <PublicationPage publication={data} metadata={false} />
  }

  return (
    <>
      <SiteHead />
      <main
        id="main-content"
        tabIndex={-1}
        className="main-content wrapper text-size-100"
      >
        <PublicationPlaceholder />
      </main>
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
  if (!process.env.GW_NEXT_HOST) {
    // Temp Mintter home screen document:
    return await getPublication(
      'bafy2bzacedq36zy5yrhutg5pocnpv2lzxr6xwfs6eeng7saoe7syxkeiq3zsm',
      'baeaxdiheaiqjrcwamuudzuc7vmzfnebn6xs45fcbgorb4vfkc44aehc3eevt25q',
      transport,
    )
  }
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
  if (process.env.GW_FORCE_CLIENT) {
    return {
      props: {
        publication: null,
      },
    }
  }
  const publication = await getHomePublication()
  if (!publication) {
    return {
      notFound: true,
    }
  }
  return {
    props: {
      publication: publication?.toJson(),
    },
  }
}
