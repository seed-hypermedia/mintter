import {ServerHelpers} from './ssr-helpers'

export type GroupView = 'front' | 'list' | null

export function getGroupView(input: string | string[] | undefined): GroupView {
  if (input === 'front') return 'front'
  if (input === 'list') return 'list'
  return null
}

export async function prefetchGroup(
  helpers: ServerHelpers,
  groupId: string,
  groupVersion: string,
  view: GroupView,
) {
  const groupRecord = await helpers.group.get.fetch({
    groupId,
    version: groupVersion,
  })
  const members = await helpers.group.listMembers.fetch({
    groupId,
    version: groupRecord.group?.version,
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
    version: groupRecord.group?.version,
  })

  return {group: groupRecord, content}
}
