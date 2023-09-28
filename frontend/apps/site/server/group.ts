import {createHmId} from '@mintter/shared'
import {GetServerSidePropsContext} from 'next'
import {daemonClient, networkingClient} from '../client'
import {setAllowAnyHostGetCORS} from './cors'
import {getPageProps, serverHelpers} from './ssr-helpers'

export type GroupView = 'front' | 'list' | null

export function getGroupView(input: string | string[] | undefined): GroupView {
  if (input === 'front') return 'front'
  if (input === 'list') return 'list'
  return null
}

export async function getGroupPathNamePageProps({
  groupEid,
  version = '',
  pathName,
  context,
}: {
  groupEid: string
  version: string
  pathName: string
  context: GetServerSidePropsContext
}) {
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
  const {query} = context
  const groupVersion = query.v ? String(query.v) : version
  const group = await helpers.group.get.fetch({groupId, version: groupVersion})
  const groupContent = await helpers.group.listContent.fetch({
    groupId,
    version: groupVersion,
  })

  return {
    props: await getPageProps(helpers, {pathName, groupId}),
  }
}

export async function getGroupPageProps({
  groupEid,
  version = '',
  context,
  view,
}: {
  groupEid: string
  version: string
  context: GetServerSidePropsContext
  view: GroupView
}) {
  const {query} = context

  const groupId = groupEid ? createHmId('g', groupEid) : undefined

  const groupVersion = query.v ? String(query.v) : version

  setAllowAnyHostGetCORS(context.res)

  if (!groupId) return {notFound: true} as const

  const helpers = serverHelpers({})

  const groupRecord = await helpers.group.get.fetch({
    groupId,
    version: groupVersion,
  })
  const members = await helpers.group.listMembers.fetch({
    groupId,
    version: groupVersion,
  })
  await Promise.all(
    members.map((member) =>
      helpers.account.get.fetch({
        accountId: member.account,
      }),
    ),
  )

  const content = await helpers.group.listContent.fetch({
    groupId,
  })

  return {
    props: await getPageProps(helpers, {groupId, version, pathName: '/', view}),
  }
}
