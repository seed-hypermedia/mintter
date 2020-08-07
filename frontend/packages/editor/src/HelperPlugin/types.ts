import {Element} from 'slate'

export interface useHelperOptions {
  trigger?: string
}

export interface HelperNodeData {
  value: string
  [key: string]: any
}

export interface HelperOptionsNodeData {
  name: string
  type: string
  url?: string
}

export interface UseHelperOptions {
  trigger?: string
}

export interface InsertBlockOptions {
  type: ELEMENT_BLOCK | ELEMENT_IMAGE
  target?: Path | Range
}

export interface HelperNode extends Element, HelperNodeData {}
