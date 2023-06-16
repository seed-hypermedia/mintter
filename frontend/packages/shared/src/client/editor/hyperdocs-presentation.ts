export type ImageBlock = {
  // and any media object really
  id: string
  type: 'image'
  content: ''
  annotations: []
  ref: string // ipfs://..., https://...
  attributes: {
    alt?: string
  }
}

export type SectionBlockAttributes = {
  childrenType?: 'group' | 'numbers' | 'bullet' | 'blockquote' // default is "group"
  showContent?: string // interpret as a bool
  isContentHeading?: string // interpret as a bool
  start?: string // interpret as a number
}

export type SectionBlock = {
  id: string
  type: 'heading' | 'paragraph'
  text: string
  attributes: SectionBlockAttributes
  annotations: TextAnnotation[]
}

export type CodeBlock = {
  id: string
  type: 'code'
  content: string
  attributes: {
    lang: string
  }
}

export type EmbedBlock = {
  id: string
  type: 'embed'
  content: ''
  ref: string // ipfs://..., https://...
  attributes: {}
}

export type Block =
  | ImageBlock // video and files coming soon
  | EmbedBlock
  | SectionBlock
  | CodeBlock

export type InlineEmbedAnnotation = {
  type: 'embed'
  starts: number[]
  ends: number[]
  ref: string // 'hd://... with #BlockRef
  attributes: {}
}

type BaseAnnotation = {
  starts: number[]
  ends: number[]
  // attributes: {}
}

export type StrongAnnotation = BaseAnnotation & {
  type: 'strong'
}

export type EmphasisAnnotation = BaseAnnotation & {
  type: 'emphasis'
}

export type UnderlineAnnoation = BaseAnnotation & {
  type: 'underline'
}

export type CodeAnnotation = BaseAnnotation & {
  type: 'code'
}

export type LinkAnnotation = BaseAnnotation & {
  type: 'link'
  ref: string
}

export type ColorAnnotation = BaseAnnotation & {
  type: 'color'
  attributes: {
    color: string
  }
}

export type TextAnnotation =
  | LinkAnnotation
  | StrongAnnotation
  | EmphasisAnnotation
  | CodeAnnotation
  | UnderlineAnnoation
  | ColorAnnotation
  | InlineEmbedAnnotation
