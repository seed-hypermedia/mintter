import {createHmId} from '@mintter/shared'
import {getPageProps, serverHelpers} from './ssr-helpers'
import {setAllowAnyHostGetCORS} from './cors'
import {GetServerSidePropsContext} from 'next'
import {daemonClient, networkingClient} from '../client'

export type GroupView = 'front' | 'list' | null

export function getGroupView(input: string | string[] | undefined): GroupView {
  if (input === 'front') return 'front'
  if (input === 'list') return 'list'
  return null
}

export async function getGroupPathNamePageProps({
  groupEid,
  pathName,
  context,
}: {
  groupEid: string
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
  const group = await helpers.group.get.fetch({groupId})
  const groupContent = await helpers.group.listContent.fetch({groupId})

  return {
    props: await getPageProps(helpers, {pathName, groupId}),
  }
}

export async function getGroupPageProps({
  groupEid,
  context,
  view,
}: {
  groupEid: string
  context: GetServerSidePropsContext
  view: GroupView
}) {
  const {params, query} = context
  const groupId = groupEid ? createHmId('g', groupEid) : undefined

  let version = query.v ? String(query.v) : null

  setAllowAnyHostGetCORS(context.res)

  if (!groupId) return {notFound: true} as const

  const helpers = serverHelpers({})

  const groupRecord = await helpers.group.get.fetch({
    groupId,
  })
  const members = await helpers.group.listMembers.fetch({
    groupId,
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
