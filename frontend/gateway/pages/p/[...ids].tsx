import {getPublication, Publication} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {GetServerSidePropsContext} from 'next'
import {useRouter} from 'next/router'
import {transport} from '../../client'
import {PublicationPlaceholder} from '../../publication-placeholder'
import {SiteHead} from '../../site-head'
import PublicationPage from '../../ssr-publication-page'

export default function CIDPublicationPage({
  publication,
}: {
  publication?: Publication | null
}) {
  if (publication === null) return <ClientCIDPage />
  return <PublicationPage publication={publication} />
}

export const getServerSideProps = async ({
  params,
  res,
}: GetServerSidePropsContext) => {
  if (process.env.VERCEL) {
    return {
      props: {
        publication: null,
      },
    }
  }
  const [documentId, version] = params?.ids || []
  // res.setHeader(
  //   'Cache-Control',
  //   `public, s-maxage=${
  //     version ? '2592000, stale-while-revalidate=3599' : '86400'
  //   }`,
  // )
  const publication = await getPublication(documentId, version, transport)
  if (!publication) {
    return {
      notFound: true,
    }
  }
  return {
    props: {
      publication: publication.toJson(),
    },
  }
}

function ClientCIDPage() {
  const router = useRouter()
  let [docId, version = ''] = router.query.ids || []
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
