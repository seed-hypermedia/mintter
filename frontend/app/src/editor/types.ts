import type {TextRun, ListStyle, BlockType} from '@mintter/client'

export type SlateVoidChildren = {
  children: Array<{text: string}>
}
export type EditorTextRun = Partial<Omit<TextRun, 'text'>> &
  Pick<TextRun, 'text'>

export type EditorQuote = SlateVoidChildren & {
  type: string
  id: string
  url: string
}

export type EditorImage = SlateVoidChildren & {
  type: string
  url: string
  alt_text: string
}

export type EditorInlineElement = EditorTextRun | EditorQuote | EditorImage

export type EditorLink = {
  type: string
  id: string
  url: string
  children: Array<EditorTextRun>
}

export type EditorBlock = {
  type: string
  id: string
  depth: number
  blockType?: BlockType
  listStyle: ListStyle
  children: Array<EditorTextRun | EditorQuote | EditorLink> // TODO: fix types
}
