interface Alternative {
  alt?: string
}

interface Resource {
  url?: string
  title?: string
}

interface Literal {
  value: any
}

interface Point {
  line: number // number >= 1
  column: number // number >= 1
  offset?: number // number >= 0?
}

interface Position {
  start: Point
  end: Point
  indent?: number // number >= 1?
}

interface Data {
  [key: string]: any
}

interface Node {
  type: string
  data?: Data
  position?: Position
}

interface Parent {
  children: Array<any>
}

interface Group {
  type: 'group'
  children: Array<FlowContent>
}

interface OrderedList {
  type: 'orderedList'
  children: Array<FlowContent>
}

interface UnorderedList {
  type: 'unorderedList'
  children: Array<FlowContent>
}

interface Paragraph extends Parent {
  type: 'paragraph'
  children: Array<PhrasingContent>
}

interface StaticParagraph extends Parent {
  type: 'staticParagraph'
  children: Array<StaticPhrasingContent>
}

interface Statement extends Parent {
  type: 'statement'
  children: [Content, GroupingContent?]
}

interface Header extends Parent {
  type: 'header'
  children: [StaticContent, GroupingContent?]
}

interface Blockquote extends Parent {
  type: 'blockquote'
  children: [Content, GroupingContent?]
}

interface Code extends Parent {
  type: 'code'
  lang?: string
  meta?: string
  children: [Content, GroupingContent?]
}

interface Video extends Alternative, Resource {
  type: 'video'
}

interface Image extends Alternative, Resource {
  type: 'image'
}

interface Embed extends Alternative, Resource {
  type: 'embed'
}

interface Link extends Resource {
  type: 'link'
}

interface Text extends Literal {
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
