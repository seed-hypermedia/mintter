import {Heading} from '@mintter/ui'
import PublicationPage from 'publication-page'
import {useRouteQuery} from 'server/router-queries'
import {trpc} from './trpc'

export type PubSlugPageProps = {
  pathName: string
}
export default function PublicationSlugPage({pathName}: PubSlugPageProps) {
  const versionQuery = useRouteQuery('v')
  const path = trpc.publication.getPath.useQuery({pathName})
  if (!path.data) return <Heading>Not found</Heading>
  return (
    <PublicationPage
      pathName={pathName}
      documentId={path.data.documentId}
      version={versionQuery || path.data.versionId}
    />
  )
}
