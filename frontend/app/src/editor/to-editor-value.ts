import type { Document, Image, InlineElement, Link, Quote, TextRun } from '@mintter/client'
import { ELEMENT_BLOCK } from './block-plugin'
import { ELEMENT_LINK } from './link-plugin'
import { ELEMENT_QUOTE } from './quote-plugin'
import type { SlateBlock, EditorLink, EditorQuote, EditorImage } from './types'

export function toEditorValue(entry: Document): Array<SlateBlock> {
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
  const { linkKey, ...rest } = entry
  return {
    id: linkKey,
    url: links[linkKey].uri,
    type: ELEMENT_LINK,
    children: [rest],
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