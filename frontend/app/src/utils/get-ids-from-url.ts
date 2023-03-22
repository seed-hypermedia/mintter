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
  const [, restUrl] = entry.split(prefix)

  if (restUrl.length <= 3) {
    throw Error(
      `getIdsfromUrl Error: url must contain a publicationId and a blockId at least. (${entry})`,
    )
  }
  const ids = restUrl.split('?')[0]
  const [docId, version, blockId] = ids.split('/')
  const newVersion = entry.match(/\?v=(.*)#?/)?.[1]
  const newBlockId = entry.match(/#(.*)$/)?.[1]
  return [
    docId,
    version ?? newVersion, // support old format for a while
    blockId ?? newBlockId,
  ]
}
