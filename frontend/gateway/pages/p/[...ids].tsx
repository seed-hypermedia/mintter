import {Account, getAccount, getPublication, Publication} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {GetServerSidePropsContext} from 'next'
import {useRouter} from 'next/router'
import {transport} from '../../client'
import {PublicationPlaceholder} from '../../publication-placeholder'
import {SiteHead} from '../../site-head'
import PublicationPage from '../../ssr-publication-page'

export default function CIDPublicationPage({
  publication,
  author,
}: {
  publication?: Publication | null
  author?: Account | null
}) {
  if (publication === null) return <ClientCIDPage />
  return <PublicationPage publication={publication} author={author} />
}

export const getServerSideProps = async ({
  params,
  res,
}: GetServerSidePropsContext) => {
  if (process.env.GW_FORCE_CLIENT) {
    return {
      props: {
        publication: null,
      },
    }
  }
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

function ClientCIDPage() {
  const router = useRouter()
  let [docId, version = ''] = router.query.ids || []
  console.log(
    '🚀 ~ file: [...ids].tsx:68 ~ ClientCIDPage ~ docId, version:',
    docId,
    version,
  )
  let {data} = useQuery({
    queryKey: ['pub', docId, version],
    enabled: !!docId,
    queryFn: () => getPublication(docId, version, transport),
  })
  if (data) {
    return <PublicationPage publication={data} />
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
