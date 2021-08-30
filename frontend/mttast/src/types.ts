import type {Node as UnistNode, Parent as UnistParent, Literal as UnistLiteral, Data as UnistData} from 'unist'

// Nodes

export interface Literal extends UnistLiteral {
  value: string
}

export interface Parent extends UnistParent {
  children: Array<UnistNode<UnistData>>
}

export interface Document extends Parent {
  type: 'document'
  title: string
  subtitle: string
  author?: string
  schema?: string
  stylesheet?: string
  children: FlowContent[]
}

export interface Group extends Parent {
  type: 'group'
  children: Array<FlowContent>
}

export interface OrderedList extends Parent {
  type: 'orderedList'
  children: Array<FlowContent>
}

export interface UnorderedList extends Parent {
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
  id: string
  children: [Content, GroupingContent] | [Content]
}

export interface Heading extends Parent {
  type: 'heading'
  id: string
  children: [Content, GroupingContent] | [Content]
}

export interface Blockquote extends Parent {
  type: 'blockquote'
  id: string
  children: [Content, GroupingContent] | [Content]
}

export interface Code extends Parent {
  type: 'code'
  id: string
  lang?: string
  meta?: string
  children: [Content, GroupingContent] | [Content]
}

export interface Callout extends Parent {
  type: 'callout'
  id: string
  children: [Content, GroupingContent] | [Content]
}

export interface Video extends Alternative, Resource {
  type: 'video'
}

export interface Image extends Alternative, Resource {
  type: 'image'
}

export interface Embed extends Alternative, Resource, Parent {
  type: 'embed'
}

export interface Link extends Resource, Parent {
  type: 'link'
  children: StaticPhrasingContent[]
}

export type Text = Literal & {
  type: 'text'
  strong?: boolean
  emphasis?: boolean
  underline?: boolean
  strikethrough?: boolean
  superscript?: boolean
  subscript?: boolean
}

// Mixin

export interface Alternative {
  alt?: string
}

export interface Resource {
  url?: string
  title?: string
}

// Content Model

export type MttastContent = FlowContent | GroupingContent | Content | PhrasingContent | EmbeddedContent

export type Content = Paragraph

export type StaticContent = StaticParagraph

export type GroupingContent = Group | OrderedList | UnorderedList

// The statements of a document
export type FlowContent = Statement | Heading | Blockquote | Code

// Content that is embeded from elsewhere
export type EmbeddedContent = Embed | Video | Image

// the text and markup of a document that's not intended for
export type StaticPhrasingContent = Text

// the text and markup of a document
export type PhrasingContent = Link | StaticPhrasingContent | EmbeddedContent
