import {Account, Publication, SiteInfo} from '@mintter/shared'
import {GetServerSidePropsContext} from 'next'
import {setAllowAnyHostGetCORS} from 'server/cors'
import {accountsClient, publicationsClient} from '../../client'
import {getSiteInfo} from '../../get-site-info'
import PublicationPage from '../../ssr-publication-page'

export default function CIDPublicationPage({
  publication,
  author,
  editors,
  siteInfo,
}: {
  publication?: Publication | null
  author?: Account | null
  siteInfo: SiteInfo | null
  editors: Array<Account>
}) {
  return (
    <PublicationPage
      publication={publication || undefined}
      author={author}
      siteInfo={siteInfo}
      editors={editors}
    />
  )
}

export const getServerSideProps = async ({
  params,
  query,
  res,
}: GetServerSidePropsContext) => {
  let [documentId, versionFromPath] = params?.ids || []
  let version = query.v ? String(query.v) : versionFromPath
  let siteInfo = await getSiteInfo()
  let publication: Publication | null = null
  let author: Account | null = null
  let editors: Array<Account> = []
  // res.setHeader(
  //   'Cache-Control',
  //   `public, s-maxage=${
  //     version ? '2592000, stale-while-revalidate=3599' : '86400'
  //   }`,
  // )
  let checkIds = documentId.split('/')
  if (checkIds.length > 1) {
    documentId = checkIds[0]
    version = checkIds[1]
  }
  try {
    publication = await publicationsClient.getPublication({
      documentId,
      version,
    })
    if (!publication || !documentId) {
      return {
        notFound: true,
      }
    }

    setAllowAnyHostGetCORS(res)

    res.setHeader('x-mintter-document-id', documentId)
    res.setHeader('x-mintter-version', publication.version)
    const definedPublisher = publication.document?.publisher
    if (definedPublisher)
      res.setHeader('x-mintter-publisher-id', definedPublisher)

    author = publication.document?.author
      ? await accountsClient.getAccount({id: publication.document?.author})
      : null

    editors = publication.document?.editors.length
      ? await Promise.all(
          publication.document?.editors.map((id) =>
            accountsClient.getAccount({id}),
          ),
        )
      : []

    console.log('🚀 ~ file: [...ids].tsx:75 ~ editors:', editors)

    return {
      props: {
        publication: publication ? publication.toJson() : null,
        author: author ? author.toJson() : null,
        siteInfo: siteInfo ? siteInfo.toJson() : null,
        editors: editors ? editors.map((e) => e.toJson()) : [],
      },
    }
  } catch (error) {
    return {
      props: {
        publication: publication ? publication.toJson() : null,
        author: author ? author.toJson() : null,
        siteInfo: siteInfo ? siteInfo.toJson() : null,
        editors: editors ? editors.map((e) => e.toJson()) : [],
      },
    }
  }
}
