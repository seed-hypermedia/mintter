import {Account, getAccount, getPublication, Publication} from '@mintter/shared'
import {GetServerSidePropsContext} from 'next'
import {transport} from '../../client'
import PublicationPage from '../../ssr-publication-page'

export default function CIDPublicationPage({
  publication,
  author,
}: {
  publication?: Publication | null
  author?: Account | null
}) {
  return (
    <PublicationPage publication={publication || undefined} author={author} />
  )
}

export const getServerSideProps = async ({
  params,
  res,
}: GetServerSidePropsContext) => {
  let [documentId, version] = params?.ids || []
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
  const publication = await getPublication(documentId, version, transport)
  if (!publication) {
    return {
      notFound: true,
    }
  }
  const author = publication.document?.author
    ? await getAccount(publication.document?.author, transport)
    : null
  return {
    props: {
      publication: publication.toJson(),
      author: author ? author.toJson() : null,
    },
  }
}
