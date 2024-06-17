import {HMBlock, HMDocument, toHMInlineContent} from '@shm/shared'
import {nanoid} from 'nanoid'

export function createDocument(props: Partial<HMDocument> = {}) {
  return props
}

export function createBlock(props: Partial<HMBlock> = {}) {
  let id = nanoid(8)
  return {
    id,
    content: toHMInlineContent(props),
    ...props,
  }
}
