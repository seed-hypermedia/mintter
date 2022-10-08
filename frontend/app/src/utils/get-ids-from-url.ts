import {MINTTER_LINK_PREFIX} from '@app/constants'

export function getIdsfromUrl(
  entry: string,
): [docId: string, version: string, blockId: string] {
  if (!entry.startsWith(MINTTER_LINK_PREFIX) && !entry.startsWith('mtt://')) {
    throw Error(
      `getIdsfromUrl Error: url must start with ${MINTTER_LINK_PREFIX}. (${entry})`,
    )
  }

  let prefix = entry.startsWith(MINTTER_LINK_PREFIX)
    ? MINTTER_LINK_PREFIX
    : 'mtt://'
  const [, ids] = entry.split(prefix)

  if (ids.length <= 3) {
    throw Error(
      `getIdsfromUrl Error: url must contain a publicationId and a blockId at least. (${entry})`,
    )
  }
  const [docId, version, blockId] = ids.split('/')
  return [docId, version, blockId]
}
