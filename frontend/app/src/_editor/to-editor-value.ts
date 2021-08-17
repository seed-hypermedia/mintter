import {Document, Image, Link, ListStyle, Quote, TextRun} from '@mintter/client'
import * as mocks from '@mintter/client/mocks'
import {ELEMENT_BLOCK} from './block-plugin'
import {toTextRun} from './inline-element'
import {ELEMENT_LINK} from './link-plugin'
import {ELEMENT_QUOTE} from './quote-plugin'
import type {EditorBlock, EditorImage, EditorLink, EditorQuote, EditorTextRun} from './types'

export function toEditorValue(entry: Document): Array<EditorBlock> {
  const currentDoc = entry
  const blocksMap = entry.blocks
  const linksMap = entry.links

  if (currentDoc.children.length === 0) {
    // no blocks (new Draft)
    return [
      {
        type: ELEMENT_BLOCK,
        id: mocks.createId(),
        listStyle: ListStyle.NONE,
        children: [{text: ''}],
      },
    ]
  } else {
    return currentDoc.children.map((blockId) => {
      const block = blocksMap[blockId]
      return {
        type: ELEMENT_BLOCK,
        id: block.id,
        listStyle: block.childListStyle,
        children: block.elements.map(({textRun, image, quote}) => {
          if (textRun && textRun.linkKey) return toEditorLink(linksMap, textRun)
          if (textRun) return textRun
          if (image) return toEditorImage(linksMap, image)
          if (quote) return toEditorQuote(linksMap, quote)
          throw new Error('unkwon element')
        }),
      }
    })
  }
}

export function toEditorLink(links: Record<string, Link>, entry: TextRun): EditorLink {
  const {linkKey, ...textRun} = entry
  return {
    id: entry.linkKey,
    url: links[entry.linkKey].uri,
    type: ELEMENT_LINK,
    children: [textRun],
  }
}

export function toEditorQuote(links: Record<string, Link>, quote: Quote): EditorQuote {
  return {
    type: ELEMENT_QUOTE,
    id: quote.linkKey,
    url: links[quote.linkKey].uri,
    children: [{text: ''}],
  }
}

export function toEditorImage(links: Record<string, Link>, image: Image): EditorImage {
  return {
    type: 'image',
    alt_text: image.altText,
    url: links[image.linkKey].uri,
    children: [{text: ''}],
  }
}
