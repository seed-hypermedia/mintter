import type {Lang} from 'shiki'
import {Position} from 'unist'

// Nodes

interface Node {
  type: string

  data?: Record<string | symbol, unknown>
  position?: Position
}

export interface Literal extends Node {
  text: string
}

export interface Parent extends Node {
  children: MttastContent[]
}

export interface MttDocument extends Parent {
  type: 'document'
  title: string
  subtitle: string
  author?: string
  schema?: string
  stylesheet?: string
  children: [GroupingContent]
  createTime?: Date
  updateTime?: Date
  publishTime?: Date
}

export interface Group extends Parent {
  type: 'group'
  children: FlowContent[]
}

export interface OrderedList extends Parent {
  type: 'orderedList'
  start?: number
  children: FlowContent[]
}

export interface UnorderedList extends Parent {
  type: 'unorderedList'
  start: number
  children: FlowContent[]
}

export interface Paragraph extends Parent {
  type: 'paragraph'
  children: PhrasingContent[]
}

export interface StaticParagraph extends Parent {
  type: 'staticParagraph'
  children: Text[]
}

export interface Statement extends Parent {
  type: 'statement'
  id: string
  revision?: string
  children: [Content] | [Content, GroupingContent]
}

export interface Heading extends Parent {
  type: 'heading'
  id: string
  revision?: string
  children: [StaticContent] | [StaticContent, GroupingContent]
}

export interface Blockquote extends Parent {
  type: 'blockquote'
  id: string
  revision?: string
  children: [Content] | [Content, GroupingContent]
}

export interface Code extends Parent {
  type: 'code'
  id: string
  lang?: Lang
  meta?: string
  revision?: string
  children: [Content] | [Content, GroupingContent]
}

export interface Video extends Alternative, Resource, Parent {
  type: 'video'
  defaultOpen?: boolean
}

export interface Image extends Alternative, Resource, Parent {
  type: 'image'
  defaultOpen?: boolean
}

export interface File extends Alternative, Resource, Parent {
  type: 'file'
  name?: string
  defaultOpen?: boolean
}

export interface Embed extends Alternative, Resource, Parent {
  type: 'embed'
}

export interface OldAsLink extends Resource, Parent {
  type: 'link'
  children: Text[]
}

export interface Text extends Literal {
  type: 'text'
  strong?: boolean
  emphasis?: boolean
  underline?: boolean
  strikethrough?: boolean
  superscript?: boolean
  subscript?: boolean
  code?: boolean
  color?: string
  // implementation relevant marks. not persistent
  codeToken?: string
  'find-highlight'?: boolean
  conversations?: Array<string>
}

export type Mark = keyof Omit<Text, 'type' | 'value'>

// Mixin

export interface Alternative {
  alt?: string
}

export interface Resource {
  url: string
  title?: string
}

// Content Model

export type MttastContent =
  | FlowContent
  | GroupingContent
  | Content
  | StaticContent
  | PhrasingContent

export type MttastNode = Parent | Literal
export type Content = Paragraph | Image | Video | File

export type StaticContent = StaticParagraph

export type GroupingContent = Group | OrderedList | UnorderedList

// The statements of a document
export type FlowContent = Statement | Heading | Blockquote | Code

// the text and markup of a document
export type PhrasingContent = OldAsLink | Embed | Text
