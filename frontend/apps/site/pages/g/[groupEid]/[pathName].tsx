import {createHmId} from '@mintter/shared'
import {Heading, Spinner} from '@mintter/ui'
import {GetServerSideProps} from 'next'
import {useRouter} from 'next/router'
import {EveryPageProps} from 'pages/_app'
import PublicationPage from 'publication-page'
import {prefetchGroup} from 'server/group'
import {useRouteQuery} from 'server/router-queries'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'
import {trpc} from 'trpc'

export default function GroupPublicationPage({}) {
  const versionQuery = useRouteQuery('v') || ''
  const router = useRouter()
  const pathName = (router.query?.pathName as string) || ''
  const siteInfo = trpc.siteInfo.get.useQuery()
  const groupEid =
    (router.query?.groupEid as string) || siteInfo.data?.groupEid || ''
  const groupId = createHmId('g', groupEid)
  const group = trpc.group.get.useQuery({
    groupId,
    version: versionQuery,
  })
  const groupContent = trpc.group.listContent.useQuery({
    groupId,
    version: group.data?.group?.version,
  })
  if (groupContent.isInitialLoading) return <Spinner />
  if (!groupContent.data) return <Heading>Not found</Heading>
  const pathItem = groupContent.data.find((item) => item?.pathName === pathName)
  if (!pathItem) return <Heading>Not found</Heading>

  return (
    <PublicationPage
      pathName={pathName}
      documentId={createHmId('d', pathItem.docId.eid)}
      version={pathItem.publication?.version}
      contextGroup={group.data?.group}
    />
  )
}

export const getServerSideProps: GetServerSideProps<EveryPageProps> = async (
  context,
) => {
  const groupEid = (context.params?.groupEid as string) || ''
  const version = (context.params?.v as string) || ''
  const helpers = serverHelpers({})
  const groupId = createHmId('g', groupEid)
  await prefetchGroup(helpers, groupId, version, 'list')
  return {props: await getPageProps(helpers, context, {})}
}
