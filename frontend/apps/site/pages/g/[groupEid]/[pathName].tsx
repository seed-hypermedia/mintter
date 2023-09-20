import {createHmId} from '@mintter/shared'
import {Heading, Spinner} from '@mintter/ui'
import {daemonClient, networkingClient} from 'client'
import {GetServerSideProps} from 'next'
import {EveryPageProps} from 'pages/_app'
import PublicationPage from 'publication-page'
import {setAllowAnyHostGetCORS} from 'server/cors'
import {useRouteQuery} from 'server/router-queries'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'
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
  const groupId = createHmId('g', groupEid)
  const helpers = serverHelpers({})

  setAllowAnyHostGetCORS(context.res)

  const info = await daemonClient.getInfo({})
  const peerInfo = await networkingClient.getPeerInfo({
    deviceId: info.deviceId,
  })
  context.res.setHeader(
    'x-mintter-site-p2p-addresses',
    peerInfo.addrs.join(','),
  )
  const group = await helpers.group.get.fetch({groupId})
  const groupContent = await helpers.group.listContent.fetch({groupId})

  return {
    props: await getPageProps(helpers, {pathName, groupId}),
  }
}
