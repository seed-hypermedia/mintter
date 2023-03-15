import {Account, Publication, SiteInfo} from '@mintter/shared'
import {GetServerSidePropsContext} from 'next'
import {accountsClient, publicationsClient} from '../../client'
import {getSiteInfo} from '../../get-site-info'
import PublicationPage from '../../ssr-publication-page'

export default function CIDPublicationPage({
  publication,
  author,
  siteInfo,
}: {
  publication?: Publication | null
  author?: Account | null
  siteInfo: SiteInfo | null
}) {
  return (
    <PublicationPage
      publication={publication || undefined}
      author={author}
      siteInfo={siteInfo}
    />
  )
}

export const getServerSideProps = async ({
  params,
  res,
}: GetServerSidePropsContext) => {
  let [documentId, version] = params?.ids || []
  let siteInfo = await getSiteInfo()
  let publication: Publication | null = null
  let author: Account | null = null
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
    if (!publication) {
      return {
        notFound: true,
      }
    }

    author = publication.document?.author
      ? await accountsClient.getAccount({id: publication.document?.author})
      : null

    return {
      props: {
        publication: publication ? publication.toJson() : null,
        author: author ? author.toJson() : null,
        siteInfo: siteInfo ? siteInfo.toJson() : null,
      },
    }
  } catch (error) {
    return {
      props: {
        publication: publication ? publication.toJson() : null,
        author: author ? author.toJson() : null,
        siteInfo: siteInfo ? siteInfo.toJson() : null,
      },
    }
  }
}
