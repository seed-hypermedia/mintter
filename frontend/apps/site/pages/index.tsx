import {Account, Publication, SiteInfo} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {GetServerSideProps} from 'next'
import {setAllowAnyHostGetCORS} from 'server/cors'
import {accountsClient, localWebsiteClient, publicationsClient} from '../client'
import {GatewayHead} from '../gateway-head'
import {getSiteInfo} from '../get-site-info'
import {PublicationPlaceholder} from '../publication-placeholder'
import {SiteHead} from '../site-head'
import PublicationPage from '../ssr-publication-page'

let pubId =
  process.env.MINTTER_HOME_PUBID ||
  'bafy2bzaceajij5bzr4yakyaxmjgffu7jq4y3sdie2tozl65igufxgrcu464gi'
let version =
  process.env.MINTTER_HOME_VERSION ||
  'baeaxdiheaiqizbsrt7joblgzp2nj6r7kptdzyv2nvsuzstxlhs5ujrhk7a4n6pi'

//https://mintter.com/p/bafy2bzaceajij5bzr4yakyaxmjgffu7jq4y3sdie2tozl65igufxgrcu464gi?v=baeaxdiheaiqizbsrt7joblgzp2nj6r7kptdzyv2nvsuzstxlhs5ujrhk7a4n6pi

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
    console.log('=== RETURN THE HOMEPAGE')
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
  try {
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

    setAllowAnyHostGetCORS(res)

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
  } catch (error) {
    const homePub = await getHomePublication()
    const siteInfo = await getSiteInfo()
    return {
      props: {
        publication: homePub?.toJson(),
        siteInfo: siteInfo ? siteInfo.toJson() : null,
      },
    }
  }
}

// mintter://bafy2bzacedfvnpy32gt7cdap2ql5hy2mke6mad7eipnufjejoorydksl6sjtc/baeaxdiheaiqeiqinxle5rpf37w6fooj5rl4q2tduln5awdfgkhgh2do2c5nnb3y
