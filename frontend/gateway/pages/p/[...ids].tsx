import {Account, Publication} from '@mintter/shared'
import {GetServerSidePropsContext} from 'next'
import {accountsClient, publicationsClient} from '../../client'
import {getSiteTitle} from '../../get-site-info'
import PublicationPage from '../../ssr-publication-page'

export default function CIDPublicationPage({
  publication,
  author,
  siteTitle,
}: {
  publication?: Publication | null
  author?: Account | null
  siteTitle: string | null
}) {
  return (
    <PublicationPage
      publication={publication || undefined}
      author={author}
      siteTitle={siteTitle}
    />
  )
}

export const getServerSideProps = async ({
  params,
  res,
}: GetServerSidePropsContext) => {
  let [documentId, version] = params?.ids || []
  let siteTitle = await getSiteTitle()
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
  console.log('=== getServerSideProps', {documentId, version})
  try {
    publication = await publicationsClient.getPublication({
      documentId,
      version,
    })
    console.log('=== getServerSideProps PUB:', publication)
    if (!publication) {
      return {
        notFound: true,
      }
    }

    author = publication.document?.author
      ? await accountsClient.getAccount({id: publication.document?.author})
      : null
    console.log('🚀 ~ file: [...ids].tsx:56 ~ author:', author)

    return {
      props: {
        publication: publication ? publication.toJson() : null,
        author: author ? author.toJson() : null,
        siteTitle,
      },
    }
  } catch (error) {
    return {
      props: {
        publication: publication ? publication.toJson() : null,
        author: author ? author.toJson() : null,
        siteTitle,
      },
    }
  }
}
