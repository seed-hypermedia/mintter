export const MINTTER_LINK_PREFIX = 'mintter://'

export function getIdsfromUrl(
  entry: string,
): [docId: string, version: string | undefined, blockId: string | undefined] {
  if (entry.startsWith('https://mintter.com/p')) {
    const urlPattern =
      /^https:\/\/mintter\.com\/p\/(\w+)(\?v=(\w+))?(#([\w,:]+))?$/
    const match = entry.match(urlPattern)
    if (match) {
      const docId: string = match[1]
      const versionId: string | undefined = match[3]
      const blockRef: string | undefined = match[5]
      return [docId, versionId, blockRef]
    }
  }

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
