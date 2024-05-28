export type EditorBlock =
  | EditorParagraphBlock
  | EditorHeadingBlock
  | EditorCodeBlock
  | EditorImageBlock
  | EditorVideoBlock
  | EditorFileBlock
  | EditorEmbedBlock
  | EditorWebEmbedBlock
  | EditorMathBlock
  | EditorNostrBlock

export type EditorInlineContent = EditorText | EditorInlineEmbed | EditorLink

// ===============

export interface EditorBaseBlock {
  id: string
  props: EditorBlockProps
  children: Array<EditorBlock>
}

export interface EditorBlockProps {
  textAlignment?: 'left' | 'center' | 'right'
  childrenType?: 'div' | 'ul' | 'ol'
  listLevel?: string
  start?: string
}

export interface EditorParagraphBlock extends EditorBaseBlock {
  type: 'paragraph'
  content: Array<EditorInlineContent>
}

export interface EditorHeadingBlock extends EditorBaseBlock {
  type: 'heading'
  content: Array<EditorInlineContent>
}

export interface EditorCodeBlock extends EditorBaseBlock {
  type: 'codeBlock'
  content: Array<EditorInlineContent>
  props: EditorBlockProps & {
    language?: string
  }
}

export interface MediaBlockProps extends EditorBlockProps {
  url?: string
  src?: string
  name?: string
  width?: number
  defaultOpen?: string
  size?: string
}

export interface EditorImageBlock extends EditorBaseBlock {
  type: 'image'
  props: MediaBlockProps
  content: []
}

export interface EditorVideoBlock extends EditorBaseBlock {
  type: 'video'
  props: MediaBlockProps
  content: []
}

export interface EditorFileBlock extends EditorBaseBlock {
  type: 'file'
  props: MediaBlockProps
  content: []
}

export interface EditorEmbedBlock extends EditorBaseBlock {
  type: 'embed'
  props: EditorBlockProps & {
    view: 'content' | 'card'
  }
  content: []
}

export interface EditorMathBlock extends EditorBaseBlock {
  type: 'math'
  content: Array<EditorInlineContent>
}

export type EditorWebEmbedBlock = EditorBaseBlock & {
  type: 'web-embed'
  props: EditorBlockProps & {
    url?: string
  }
}

export type EditorNostrBlock = EditorBaseBlock & {
  type: 'nostr'
  props: EditorBlockProps & {
    name?: string
    url?: string
    text?: string
    size: number
  }
}

export interface EditorText extends EditorBaseInlineContent {
  type: 'text'
  text: string
}

export interface EditorLink extends EditorBaseInlineContent {
  type: 'link'
  href: string
  content: Array<EditorInlineContent>
}

export interface EditorInlineEmbed {
  type: 'inline-embed'
  ref: string
}

export interface EditorBaseInlineContent {
  styles: EditorInlineStyles | {}
}

export interface EditorInlineStyles {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
}
