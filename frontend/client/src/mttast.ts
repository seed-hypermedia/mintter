export interface Alternative {
  alt?: string
}

export interface Resource {
  url?: string
  title?: string
}

export interface Literal {
  value: unknown
}

export interface Point {
  line: number // number >= 1
  column: number // number >= 1
  offset?: number // number >= 0?
}

export interface Position {
  start: Point
  end: Point
  indent?: number // number >= 1?
}

export interface Data {
  [key: string]: unknown
}

export interface Node {
  type: string
  data?: Data
  position?: Position
}

export interface Parent {
  children: Array<unknown>
}

export interface Group {
  type: 'group'
  children: Array<FlowContent>
}

export interface OrderedList {
  type: 'orderedList'
  children: Array<FlowContent>
}

export interface UnorderedList {
  type: 'unorderedList'
  children: Array<FlowContent>
}

export interface Paragraph extends Parent {
  type: 'paragraph'
  children: Array<PhrasingContent>
}

export interface StaticParagraph extends Parent {
  type: 'staticParagraph'
  children: Array<StaticPhrasingContent>
}

export interface Statement extends Parent {
  type: 'statement'
  children: [Content, GroupingContent?]
}

export interface Header extends Parent {
  type: 'header'
  children: [StaticContent, GroupingContent?]
}

export interface Blockquote extends Parent {
  type: 'blockquote'
  children: [Content, GroupingContent?]
}

export interface Code extends Parent {
  type: 'code'
  lang?: string
  meta?: string
  children: [Content, GroupingContent?]
}

export interface Video extends Alternative, Resource {
  type: 'video'
}

export interface Image extends Alternative, Resource {
  type: 'image'
}

export interface Embed extends Alternative, Resource {
  type: 'embed'
}

export interface Link extends Resource {
  type: 'link'
}

export interface Text extends Literal {
  type: 'text'
  strong?: boolean
  emphasis?: boolean
  underline?: boolean
  strikethrough?: boolean
  superscript?: boolean
  subscript?: boolean
}

export type Content = Paragraph

export type StaticContent = StaticParagraph

export type GroupingContent = Group | OrderedList | UnorderedList

// The statements of a document
export type FlowContent = Statement | Header | Blockquote

// Content that is embeded from elsewhere
export type EmbeddedContent = Embed | Video | Image

// the text and markup of a document that's not intended for
export type StaticPhrasingContent = Text

// the text and markup of a document
export type PhrasingContent = Link | StaticPhrasingContent | EmbeddedContent
