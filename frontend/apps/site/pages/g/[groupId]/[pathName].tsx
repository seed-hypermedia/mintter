import {GetServerSideProps} from 'next'
import {EveryPageProps} from 'pages/_app'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'
import {setAllowAnyHostGetCORS} from 'server/cors'
import {daemonClient, networkingClient} from 'client'
import {Heading, Spinner} from '@mintter/ui'
import {useRouteQuery} from 'server/router-queries'
import PublicationPage from 'publication-page'
import {trpc} from 'trpc'

export type GroupPubPageProps = {
  groupEid: string
  pathName: string
}
export default function GroupPublicationPage({
  pathName,
  groupEid,
}: GroupPubPageProps) {
  const versionQuery = useRouteQuery('v')
  const groupPathQuery = trpc.group.getGroupPath.useQuery({
    groupEid,
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
    />
  )
}

export const getServerSideProps: GetServerSideProps<
  EveryPageProps & GroupPubPageProps
> = async (context) => {
  const pathName = (context.params?.pathName as string) || ''
  const groupEid = (context.params?.groupId as string) || ''
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
  const group = await helpers.group.get.fetch({groupEid})
  const groupContent = await helpers.group.listContent.fetch({groupEid})

  return {
    props: await getPageProps(helpers, {pathName, groupEid}),
  }
}
