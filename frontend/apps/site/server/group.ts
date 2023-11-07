import {createHmId} from '@mintter/shared'
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
  groupVersion?: string,
) {
  if (!groupId) return null

  console.log('prefetching group', {
    groupId,
    version: groupVersion,
  })
  const groupRecord = await helpers.group.get.fetch({
    groupId,
    version: groupVersion || '',
  })
  if (!groupRecord.group) return null
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
  console.log('prefetching group.listContent', {
    groupId,
    version: groupRecord.group?.version,
  })
  const content = await helpers.group.listContent.fetch({
    groupId,
    version: groupRecord.group?.version,
  })

  return {group: groupRecord, content}
}

export async function prefetchGroupContent(
  helpers: ServerHelpers,
  prefetched: Awaited<ReturnType<typeof prefetchGroup>>,
  pathName?: string,
) {
  const contentPath = !pathName || pathName === '/' ? '/' : pathName
  const group = prefetched?.group
  const content = prefetched?.content
  const contentItem = content?.find((item) => item?.pathName === contentPath)
  if (!contentItem?.docId || contentItem?.docId.type !== 'd') return null
  const publication = await helpers.publication.get.prefetch({
    documentId: createHmId('d', contentItem.docId.eid),
    versionId: contentItem.docId.version || undefined,
  })
}
