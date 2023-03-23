export const MINTTER_LINK_PREFIX = 'mintter://'

export function getIdsfromUrl(
  entry: string,
): [docId: string, version: string | undefined, blockId: string | undefined] {
  if (!entry.startsWith(MINTTER_LINK_PREFIX)) {
    throw Error(
      `getIdsfromUrl Error: url must start with ${MINTTER_LINK_PREFIX}. (${entry})`,
    )
  }

  const [, restUrl] = entry.split(MINTTER_LINK_PREFIX)

  if (restUrl.length <= 3) {
    throw Error(
      `getIdsfromUrl Error: url must contain a publicationId and a blockId at least. (${entry})`,
    )
  }
  const ids = restUrl.split('?')[0]
  const [docId, oldVersion, oldBlockId] = ids.split('/')
  const newVersion = entry.match(/\?v=([^#]*)/)?.[1]
  const newBlockId = entry.match(/#(.*)$/)?.[1]
  const version = oldVersion ?? newVersion // support old format for a while
  const blockId = oldBlockId ?? newBlockId
  return [docId, version, blockId]
}
