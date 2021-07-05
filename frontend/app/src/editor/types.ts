import type {TextRun, ListStyle, Block_Type} from '@mintter/client'
import type {ELEMENT_BLOCK} from './block-plugin'
import type {ELEMENT_LINK} from './link-plugin'
import type {ELEMENT_QUOTE} from './quote-plugin'

export type SlateVoidChildren = {
  children: Array<{text: string}>
}
export type EditorTextRun = Partial<Omit<TextRun, 'text'>> & Pick<TextRun, 'text'>

export type EditorQuote = SlateVoidChildren & {
  type: typeof ELEMENT_QUOTE
  id: string
  url: string
}

export type EditorImage = SlateVoidChildren & {
  type: 'image'
  url: string
  alt_text: string
}

export type EditorInlineElement = EditorTextRun | EditorQuote | EditorImage

export type EditorLink = {
  type: typeof ELEMENT_LINK
  id: string
  url: string
  children: Array<EditorTextRun>
}

export type EditorBlock = {
  type: typeof ELEMENT_BLOCK
  id: string
  // depth: number
  blockType?: Block_Type
  listStyle: ListStyle
  children: Array<EditorTextRun | EditorQuote | EditorLink | EditorImage> // TODO: fix types
}
