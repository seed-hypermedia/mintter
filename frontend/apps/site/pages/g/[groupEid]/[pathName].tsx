import {getGroupPathNamePageProps} from 'server/group'
import {Heading, Spinner} from '@mintter/ui'
import {GetServerSideProps} from 'next'
import {EveryPageProps} from 'pages/_app'
import PublicationPage from 'publication-page'
import {useRouteQuery} from 'server/router-queries'
import {trpc} from 'trpc'

export type GroupPubPageProps = {
  groupId: string
  pathName: string
}
export default function GroupPublicationPage({
  pathName,
  groupId,
}: GroupPubPageProps) {
  const versionQuery = useRouteQuery('v')
  const groupPathQuery = trpc.group.getGroupPath.useQuery({
    groupId,
    version: versionQuery,
    pathName,
  })
  if (groupPathQuery.isInitialLoading) return <Spinner />
  if (!groupPathQuery.data) return <Heading>Not found</Heading>
  return (
    <PublicationPage
      pathName={pathName}
      documentId={groupPathQuery.data.documentId}
      version={versionQuery || groupPathQuery.data.documentVersion}
      contextGroup={groupPathQuery.data.group}
    />
  )
}

export const getServerSideProps: GetServerSideProps<
  EveryPageProps & GroupPubPageProps
> = async (context) => {
  const pathName = (context.params?.pathName as string) || ''
  const groupEid = (context.params?.groupEid as string) || ''
  return await getGroupPathNamePageProps({
    groupEid,
    pathName,
    context,
  })
}
