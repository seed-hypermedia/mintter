import {Account, Publication, SiteInfo} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {GetServerSideProps} from 'next'
import {accountsClient, localWebsiteClient, publicationsClient} from '../client'
import {GatewayHead} from '../gateway-head'
import {getSiteInfo} from '../get-site-info'
import {PublicationPlaceholder} from '../publication-placeholder'
import {SiteHead} from '../site-head'
import PublicationPage from '../ssr-publication-page'

let pubId =
  process.env.MINTTER_HOME_PUBID ||
  'bafy2bzacea346azbi4r5fxebdvz6wpkak7ati3cf5vywtruw4aabjeoi2332w'
let version =
  process.env.MINTTER_HOME_VERSION ||
  'baeaxdiheaiqdibxfrclwutlnc73bey7yrgqqbggbsdoz5b2d2rlsk7euvqompey'
// mintter://bafy2bzacebrswg7wbkxvhdzwcpfmhdzy2u5qehdy7pwpf7dx75jitx2p5lwtq/baeaxdiheaiqaq2xozmaoimhcylcenzowojmr6a7g2xpwljnzzs4ekkm6gnftnnq

// let pubId = "bafy2bzacebrswg7wbkxvhdzwcpfmhdzy2u5qehdy7pwpf7dx75jitx2p5lwtq"
// let version = "baeaxdiheaiqaq2xozmaoimhcylcenzowojmr6a7g2xpwljnzzs4ekkm6gnftnnq"

function DefaultHomePage({siteInfo}: {siteInfo: SiteInfo | null}) {
  let {data} = useQuery({
    queryKey: ['home publication', pubId, version],
    queryFn: () =>
      publicationsClient.getPublication({documentId: pubId, version}),
  })
  if (data) {
    return (
      <PublicationPage
        publication={data}
        metadata={false}
        siteInfo={siteInfo}
      />
    )
  }

  return (
    <>
      {siteInfo ? <SiteHead siteInfo={siteInfo} /> : <GatewayHead />}

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
  siteInfo = null,
}: {
  publication?: Publication | null
  author: Account | null
  siteInfo: SiteInfo | null
}) {
  if (!publication) return <DefaultHomePage siteInfo={siteInfo} />

  return (
    <PublicationPage
      publication={publication}
      metadata={false}
      author={author}
      siteInfo={siteInfo}
    />
  )
}

async function getHomePublication(): Promise<Publication | null> {
  if (!process.env.GW_NEXT_HOST) {
    // Temp Mintter home screen document:
    return await publicationsClient.getPublication({documentId: pubId, version})
  }

  try {
    const pathRecord = await localWebsiteClient.getPath({path: '/'})
    const publication = pathRecord?.publication
    return publication || null
  } catch (e) {
    return null
  }
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const {res} = context
  const publication = await getHomePublication()
  const siteInfo = await getSiteInfo()
  if (!publication?.document) {
    return {
      props: {
        publication: null,
        author: null,
        siteInfo: siteInfo ? siteInfo.toJson() : null,
      },
    }
  }

  res.setHeader('x-mintter-document-id', publication.document.id)
  res.setHeader('x-mintter-version', publication.version)
  const definedPublisher = publication.document?.publisher
  if (definedPublisher)
    res.setHeader('x-mintter-publisher-id', definedPublisher)

  const author = publication.document?.author
    ? await accountsClient.getAccount({id: publication.document?.author})
    : null
  return {
    props: {
      publication: publication?.toJson(),
      author: author ? author.toJson() : null,
      siteInfo: siteInfo ? siteInfo.toJson() : null,
    },
  }
}

// mintter://bafy2bzacedfvnpy32gt7cdap2ql5hy2mke6mad7eipnufjejoorydksl6sjtc/baeaxdiheaiqeiqinxle5rpf37w6fooj5rl4q2tduln5awdfgkhgh2do2c5nnb3y
