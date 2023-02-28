import {
  Account,
  getAccount,
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

let pubId =
  process.env.MINTTER_HOME_PUBID ||
  'bafy2bzacea346azbi4r5fxebdvz6wpkak7ati3cf5vywtruw4aabjeoi2332w'
let version =
  process.env.MINTTER_HOME_VERSION ||
  'baeaxdiheaiqdibxfrclwutlnc73bey7yrgqqbggbsdoz5b2d2rlsk7euvqompey'

function DefaultHomePage() {
  let {data} = useQuery({
    queryKey: ['home publication', pubId, version],
    queryFn: () => getPublication(pubId, version, transport),
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
  author,
}: {
  publication?: Publication | null
  author: Account | null
}) {
  if (!publication) return <DefaultHomePage />
  return (
    <PublicationPage
      publication={publication}
      metadata={false}
      author={author}
    />
  )
}

async function getHomePublication(): Promise<Publication | null> {
  if (!process.env.GW_NEXT_HOST) {
    // Temp Mintter home screen document:

    // https://www.mintter.com/p/bafy2bzacebeq7l4bp4fzmox47fj62bfpuzi6lizx5j3fj7jyws7fztnizu7ts/baeaxdiheaiqpjri6ulmrcvehzszraaallp2xpfb5zoxe7j7tulwph46wewle5gi
    return await getPublication(pubId, version, transport)
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
      props: {publication: null, author: null},
    }
  }
  const author = publication.document?.author
    ? await getAccount(publication.document?.author, transport)
    : null
  return {
    props: {
      publication: publication?.toJson(),
      author: author ? author.toJson() : null,
    },
  }
}
