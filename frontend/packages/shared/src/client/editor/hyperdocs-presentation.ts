export type ImageBlock = {
  // and any media object really
  type: 'image'
  content: ''
  annotations: []
  ref: string // ipfs://..., https://...
  attributes: {
    alt?: string
  }
}

export type SectionBlock = {
  type: 'heading' | 'paragraph' | 'section'
  content: string
  children: Block[]
  attributes: {
    childrenType?: null | 'ordered' | 'unordered' | 'blockquote'
    showContent?: boolean
    isContentHeading?: boolean
    start: number
  }
  annotations: TextAnnotation[]
}

export type CodeBlock = {
  type: 'code'
  content: string
  children: Block[]
  attributes: {
    lang: string
  }
}

export type EmbedBlock = {
  type: 'embed'
  content: ''
  ref: string // ipfs://..., https://...
  attributes: {}
  children: Block[]
}

export type Block =
  | ImageBlock // video and files coming soon
  | EmbedBlock
  | SectionBlock
  | CodeBlock

export type InlineEmbedAnnotation = {
  type: 'embed'
  starts: [number]
  ends: [number]
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

export type ColorAnnotation = BaseAnnotation & {
  type: 'color'
  attributes: {
    color: string
  }
}

export type TextAnnotation =
  | StrongAnnotation
  | EmphasisAnnotation
  | UnderlineAnnoation
  | ColorAnnotation
  | InlineEmbedAnnotation
