import type {Document} from '@mintter/client'

import {ELEMENT_BLOCK} from './editor/block-plugin'
import {ELEMENT_LINK} from './editor/link-plugin'
import {ELEMENT_QUOTE} from './editor/quote-plugin'
import type {SlateBlock} from './editor/types'

export function toEditorValue(entry: Document): Array<SlateBlock> {
  console.log(
    '🚀 ~ file: to-editor-value.ts ~ line 9 ~ toEditorValue ~ entry',
    entry,
  )
  const currentDoc = entry

  const blocksMap = entry.blocks
  const linksMap = entry.links
  return currentDoc.children.map((blockId: string) => {
    const block = blocksMap[blockId]
    return {
      id: block?.id,
      type: ELEMENT_BLOCK,
      depth: 0,
      listStyle: block.childListStyle,
      children: block.elements.map<any>(({textRun, image, quote}) => {
        if (image) {
          return {
            type: 'image',
            url: linksMap[image.linkKey].uri,
            alt_text: image.altText,
            children: [{text: ''}],
          }
        } else if (textRun) {
          if (textRun.linkKey) {
            return {
              type: ELEMENT_LINK,
              url: linksMap[textRun.linkKey].uri,
              children: [textRun],
            }
          } else {
            return textRun
          }
        } else if (quote) {
          return {
            type: ELEMENT_QUOTE,
            id: '',
            url: linksMap[quote.linkKey].uri,
            children: [{text: ''}],
          }
        } else {
          throw new Error(`unkown element`)
        }
      }),
    }
  })
}
