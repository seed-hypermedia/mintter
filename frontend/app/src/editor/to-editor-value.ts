import {Document, InlineElement, Link, TextRun} from '@mintter/client'
import {ELEMENT_BLOCK} from './block-plugin'
import {ELEMENT_LINK} from './link-plugin'
import {ELEMENT_QUOTE} from './quote-plugin'
import {SlateBlock, SlateLink} from './types'

export function toEditorValue(entry: Document): Array<SlateBlock> {
  // console.log(
  //   '🚀 ~ file: to-editor-value.ts ~ line 9 ~ toEditorValue ~ entry',
  //   entry,
  // )
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
      children: block.elements.map<any>(
        ({textRun, image, quote}: InlineElement) => {
          if (image) {
            return {
              type: 'image',
              url: linksMap[image.linkKey].uri,
              alt_text: image.altText,
              children: [{text: ''}],
            }
          } else if (textRun) {
            if (textRun.linkKey) {
              return toEditorLink(linksMap, textRun)
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
        },
      ),
    }
  })
}

export function toEditorLink(
  links: {[key: string]: Link},
  entry: TextRun,
): SlateLink {
  const {linkKey, ...rest} = entry
  return {
    id: linkKey,
    url: links[linkKey].uri,
    type: ELEMENT_LINK,
    children: [rest],
  }
}
