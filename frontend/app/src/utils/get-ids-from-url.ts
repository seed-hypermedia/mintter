import {MINTTER_LINK_PREFIX} from '@app/constants'

export function getIdsfromUrl(
  entry: string,
): [docId: string, version: string, blockId: string] {
  if (!entry.startsWith(MINTTER_LINK_PREFIX)) {
    throw Error(
      `getIdsfromUrl Error: url must start with ${MINTTER_LINK_PREFIX}. (${entry})`,
    )
  }

  const [, ids] = entry.split(MINTTER_LINK_PREFIX)

  if (ids.length <= 3) {
    throw Error(
      `getIdsfromUrl Error: url must contain a publicationId and a blockId at least. (${entry})`,
    )
  }
  const [docId, version, blockId] = ids.split('/')
  return [docId, version, blockId]
}
