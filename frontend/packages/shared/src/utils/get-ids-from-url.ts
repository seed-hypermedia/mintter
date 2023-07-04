export const HYPERDOCS_LINK_PREFIX = 'hd://d/'

export function getIdsfromUrl(
  entry: string,
): [docId: string | undefined, version?: string, blockId?: string] {
  if (
    entry.startsWith('https://mintter.com/d/') ||
    entry.startsWith('https://www.mintter.com/d/')
  ) {
    const urlPattern =
      /^https:\/\/(www\.)?mintter\.com\/d\/(\w+)(\?v=(\w+))?(#([\w,:]+))?$/
    const match = entry.match(urlPattern)
    if (match) {
      const docId: string = match[2]
      const versionId: string | undefined = match[4]
      const blockRef: string | undefined = match[5]
      return [docId, versionId, blockRef]
    }
  }

  if (!entry.startsWith(HYPERDOCS_LINK_PREFIX)) {
    return [undefined, undefined, undefined]
  }

  const [, restUrl] = entry.split(HYPERDOCS_LINK_PREFIX)

  if (restUrl.length <= 3) {
    return [undefined, undefined, undefined]
  }

  const ids = restUrl.split('?')[0]
  const [docId, oldVersion, oldBlockId] = ids.split('/')
  const newVersion = entry.match(/\?v=([^#]*)/)?.[1]
  const newBlockId = entry.match(/#(.*)$/)?.[1]
  const version = oldVersion ?? newVersion // support old format for a while
  const blockId = oldBlockId ?? newBlockId

  return [docId, version, blockId]
}
