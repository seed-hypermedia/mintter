export type Styles = {
  bold?: true
  italic?: true
  underline?: true
  strike?: true
  code?: true
  textColor?: string
  backgroundColor?: string
}

export type ToggledStyle = {
  [K in keyof Styles]-?: Required<Styles>[K] extends true ? K : never
}[keyof Styles]

export type ColorStyle = {
  [K in keyof Styles]-?: Required<Styles>[K] extends string ? K : never
}[keyof Styles]

export type StyledText = {
  type: 'text'
  text: string
  styles: Styles
}

export type Link = {
  type: 'link'
  href: string
  content: StyledText[]
}

export type PartialLink = Omit<Link, 'content'> & {
  content: string | Link['content']
}

export type InlineContent = StyledText | Link
export type PartialInlineContent = StyledText | PartialLink

export type EditorParagraphBlock = {
  type: 'paragraph'
  id: string
  content: InlineContent[]
  children: EditorBlock[]
  props: Record<string, never>
}
export type EditorHeadingBlock = {
  type: 'heading'
  id: string
  content: InlineContent[]
  children: EditorBlock[]
  props: {
    level: '1' | '2' | '3'
  }
}
export type EditorImageBlock = {
  type: 'image'
  id: string
  props: {
    url: string
  }
  content: InlineContent[]
}

export type EditorFileBlock = {
  type: 'file'
  id: string
  props: {
    url: string
    name: string
  }
}

export type EditorEmbedBlock = {
  type: 'embedBlock'
  id: string
  props: {
    ref: string
  }
}

export type EditorBlock =
  | EditorParagraphBlock
  | EditorHeadingBlock
  | EditorImageBlock
  | EditorFileBlock
  | EditorEmbedBlock
