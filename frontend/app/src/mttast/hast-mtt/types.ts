import {Element as HastElement, Parent as HastParent, Root as HastRoot} from 'hast'
import {MttastNode, Text} from '../'
export type HastElememtChild = HastElement
export type HastNode = HastRoot | HastElememtChild

export type Handle = (h: H, node: MttastNode, parent?: HastParent) => MttastNode | Array<MttastNode> | void

export type Properties = Record<string, unknown>

export type Handlers = Record<string, Handle>

export type Options = {
  handlers: Handlers
  document: boolean
  newlines: boolean
}

export type TextProps = Omit<Text, 'value' | 'type' | 'data'>

export type Context = {
  nodeById: Record<string, HastElement>
  baseFound: boolean
  frozenBaseUrl: string | null
  wrapText: boolean | null
  handlers: Handlers
  document?: boolean
  textProps: TextProps
}

export type HWithProps = (
  node: HastNode,
  type: string,
  props?: Properties,
  children?: string | Array<MttastNode>,
) => MttastNode

export type HWithoutProps = (node: HastNode, type: string, children?: string | Array<MttastNode>) => MttastNode

export type H = HWithProps & HWithoutProps & Context
