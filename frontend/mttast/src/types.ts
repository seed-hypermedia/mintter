import type {Lang} from 'shiki'

// Nodes

interface Node {
  type: string

  data?: Record<string | symbol, unknown>
}

export interface Literal extends Node {
  value: string
}

export interface Parent extends Node {
  children: MttastContent[]
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
  start?: number
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
  lang?: Lang
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

export interface Text extends Literal {
  type: 'text'
  strong?: boolean
  emphasis?: boolean
  underline?: boolean
  strikethrough?: boolean
  superscript?: boolean
  subscript?: boolean
  color?: string
}

// Mixin

export interface Alternative {
  alt?: string
}

export interface Resource {
  url: string
  title?: string
}

// Content Model

export type MttastContent = FlowContent | GroupingContent | Content | StaticContent | PhrasingContent | Document

export type Content = Paragraph

export type StaticContent = StaticParagraph

export type GroupingContent = Group | OrderedList | UnorderedList

// The statements of a document
export type FlowContent = Statement | Heading | Blockquote | Code | Callout

// the text and markup of a document that's not intended for
export type StaticPhrasingContent = Text | Video | Image

// the text and markup of a document
export type PhrasingContent = Link | Embed | StaticPhrasingContent
