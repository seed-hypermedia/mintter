import type {Node, Parent, Literal} from 'unist'

export interface Alternative {
  alt?: string
}

export interface Resource {
  url?: string
  title?: string
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

// Statement represents a unit of discourse dealing with a particular point or idea.
export interface Statement extends Parent {
  type: 'statement'
  children: [Content, GroupingContent] | [Content]
}

export interface Header extends Parent {
  type: 'header'
  children: [StaticContent, GroupingContent]
}

export interface Blockquote extends Parent {
  type: 'blockquote'
  children: [Content, GroupingContent] | [Content]
}

export interface Code extends Parent {
  type: 'code'
  lang?: string
  meta?: string
  children: [Content, GroupingContent] | [Content]
}

export interface Video extends Node, Alternative, Resource {
  type: 'video'
}

export interface Image extends Node, Alternative, Resource {
  type: 'image'
}

export interface Embed extends Node, Alternative, Resource {
  type: 'embed'
}

export interface Link extends Parent, Resource {
  type: 'link'
  children: Array<StaticPhrasingContent>
}

export interface Text extends Literal {
  type: 'text'
  value: string
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
