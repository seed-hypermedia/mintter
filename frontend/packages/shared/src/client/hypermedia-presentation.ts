export type HMBlockChildrenType = 'group' | 'ol' | 'ul' | 'blockquote'

export type HMBlockAttributes = {
  childrenType?: HMBlockChildrenType // default is "group"
  start?: string // interpret as a number
  showContent?: string // interpret as a bool
}

export type ParagraphBlock = {
  id: string
  type: 'paragraph'
  text: string
  attributes: HMBlockAttributes
  annotations: TextAnnotation[]
}

export type HeadingBlock = {
  id: string
  type: 'heading'
  text: string
  attributes: HMBlockAttributes
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

export type FileBlock = {
  id: string
  type: 'file'
  ref: string
  attributes: {
    name?: string
    size?: string
  }
}

export type ImageBlock = {
  // and any media object really
  id: string
  type: 'image'
  content: ''
  annotations: []
  ref: string // ipfs://..., https://...
  attributes: HMBlockAttributes & {
    alt?: string
  }
}

export type EmbedBlock = {
  id: string
  type: 'embed'
  content: ''
  ref: string // ipfs://..., https://...
  attributes: HMBlockAttributes
}

export type PresentationBlock =
  | ImageBlock // video and files coming soon
  | EmbedBlock
  | ParagraphBlock
  | HeadingBlock
  | CodeBlock
  | FileBlock

export type InlineEmbedAnnotation = {
  type: 'embed'
  starts: number[]
  ends: number[]
  ref: string // 'hm://... with #BlockRef
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

export type UnderlineAnnotation = BaseAnnotation & {
  type: 'underline'
}

export type StrikeAnnotation = BaseAnnotation & {
  type: 'strike'
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
  | UnderlineAnnotation
  | StrikeAnnotation
  | ColorAnnotation
  | InlineEmbedAnnotation
