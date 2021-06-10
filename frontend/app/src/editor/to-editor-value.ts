import type {Document, InlineElement, Link, Quote, TextRun} from '@mintter/client'
import {ELEMENT_BLOCK} from './block-plugin'
import { toTextRun } from './inline-element'
import {ELEMENT_LINK} from './link-plugin'
import {ELEMENT_QUOTE} from './quote-plugin'
import type {EditorBlock, EditorImage, EditorLink, EditorQuote, EditorTextRun} from './types'

export function toEditorValue(entry: Document): Array<EditorBlock> {
  const currentDoc = entry
  const blocksMap = entry.blocks
  const linksMap = entry.links
  return currentDoc.children.map((blockId: string) => {
    const block = blocksMap[blockId]
    return {
      id: block.id,
      type: ELEMENT_BLOCK,
      depth: 0,
      listStyle: block.childListStyle,
      children: block.elements.map(
        ({textRun, image, quote}) => {
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
              return toEditorTextRun(textRun)
            }
          } else if (quote) {
            return toEditorQuote(linksMap, quote)
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
): EditorLink {
  return {
    id: entry.linkKey,
    url: links[entry.linkKey].uri,
    type: ELEMENT_LINK,
    children: [toEditorTextRun(entry)],
  }
}

export function toEditorQuote(
  links: {[key: string]: Link},
  entry: Quote,
): EditorQuote {
  return {
    type: ELEMENT_QUOTE,
    id: entry.linkKey,
    url: links[entry.linkKey].uri,
    children: [{text: ''}],
  }
}

export function toEditorTextRun(entry: TextRun): EditorTextRun {
  let result: EditorTextRun = {text: entry.text}
  const trueValues = Object.keys(entry).map((key: keyof EditorTextRun) => {
    if (key == 'text' || key == 'linkKey') return
    if (entry[key]) {
      result[key] = entry[key]
    }

  })
  return result
}
