import { API_FILE_UPLOAD_URL } from '@shm/shared'
import { toast } from '@shm/ui'
import { Node, NodeType } from 'prosemirror-model'

export type BlockInfoWithoutPositions = {
  id: string
  node: Node
  contentNode: Node
  contentType: NodeType
  numChildBlocks: number
}

export type BlockInfo = BlockInfoWithoutPositions & {
  startPos: number
  endPos: number
  depth: number
}

/**
 * Helper function for `getBlockInfoFromPos`, returns information regarding
 * provided blockContainer node.
 * @param blockContainer The blockContainer node to retrieve info for.
 */
export function getBlockInfo(blockContainer: Node): BlockInfoWithoutPositions {
  const id = blockContainer.attrs['id']
  const contentNode = blockContainer.firstChild!
  const contentType = contentNode.type
  const numChildBlocks =
    blockContainer.childCount === 2 ? blockContainer.lastChild!.childCount : 0

  return {
    id,
    node: blockContainer,
    contentNode,
    contentType,
    numChildBlocks,
  }
}


type FileType = {
  id: string
  props: {
    url: string
    name: string
    size: string
  }
  children: []
  content: []
  type: string
}

export async function handleDragMedia(file: File) {
  if (file.size > 62914560) {
    toast.error(`The size of ${file.name} exceeds 60 MB.`)
    return null
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await fetch(API_FILE_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    })
    const data = await response.text()
    return {
      url: data ? `ipfs://${data}` : '',
      name: file.name,
      size: file.size.toString(),
    } as FileType['props']
  } catch (error) {
    console.log(error.message)
    toast.error('Failed to upload file.')
  }
}

export function generateBlockId(length: number = 8): string {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export const chromiumSupportedImageMimeTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/apng',
  'image/avif',
])

export const chromiumSupportedVideoMimeTypes = new Set([
  'video/mp4',
  'video/webm',
])
