import {getPublication} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {useRouter} from 'next/router'
import {transport} from '../../client'
import {PublicationPlaceholder} from '../../publication-placeholder'
import {SiteHead} from '../../site-head'
import PublicationPage from '../../ssr-publication-page'

// export default function CIDPublicationPage({
//   publication,
// }: {
//   publication?: Publication
// }) {
//   return <PublicationPage publication={publication} />
// }

// export const getServerSideProps: GetServerSideProps = async (context) => {
//   const [documentId, version] = context.params?.ids || []
//   const publication = await getPublication(documentId, version)
//   return {
//     props: {
//       publication: publication.toJson(),
//     },
//   }
// }

export default function CIDPublicationPage() {
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
