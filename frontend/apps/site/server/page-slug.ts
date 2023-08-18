import {GetServerSidePropsContext} from 'next'
import {setAllowAnyHostGetCORS} from './cors'
import {getPageProps, serverHelpers} from './ssr-helpers'
import {daemonClient, networkingClient} from 'client'

export async function prepareSlugPage(
  context: GetServerSidePropsContext,
  pathName: string,
) {
  const helpers = serverHelpers({})

  setAllowAnyHostGetCORS(context.res)

  const info = await daemonClient.getInfo({})
  const peerInfo = await networkingClient.getPeerInfo({deviceId: info.deviceId})

  context.res.setHeader(
    'x-mintter-site-p2p-addresses',
    peerInfo.addrs.join(','),
  )

  const path = await helpers.publication.getPath.fetch({pathName})

  if (!path) return {notFound: true} as const
  await helpers.publication.get.prefetch({
    documentId: path.documentId,
    versionId: path.versionId,
  })
  return {
    props: await getPageProps(helpers, {pathName}),
  }
}
