import type { Document, Image, Link, Quote, TextRun } from '@mintter/client'
import { ELEMENT_BLOCK } from './block-plugin'
import { toTextRun } from './inline-element'
import { ELEMENT_LINK } from './link-plugin'
import { ELEMENT_QUOTE } from './quote-plugin'
import type { EditorBlock, EditorImage, EditorLink, EditorQuote, EditorTextRun } from './types'

export function toEditorValue(entry: Document): Array<EditorBlock> {
  const currentDoc = entry
  const blocksMap = entry.blocks
  const linksMap = entry.links

  return currentDoc.children.map(blockId => {
    const block = blocksMap[blockId]
    return {
      type: ELEMENT_BLOCK,
      id: block.id,
      listStyle: block.childListStyle,
      children: block.elements.map(({ textRun, image, quote }) => {
        if (textRun && textRun.linkKey) return toEditorLink(linksMap, textRun)
        if (textRun) return textRun
        if (image) return toEditorImage(linksMap, image)
        if (quote) return toEditorQuote(linksMap, quote)
        throw new Error('unkwon element')
      })
    }
  })
}

export function toEditorLink(links: Record<string, Link>, entry: TextRun): EditorLink {
  const { linkKey, ...textRun } = entry
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
    children: [{ text: '' }],
  }
}

export function toEditorImage(links: Record<string, Link>, image: Image): EditorImage {
  return {
    type: 'image',
    alt_text: image.altText,
    url: links[image.linkKey].uri,
    children: [{ text: '' }]
  }
}
