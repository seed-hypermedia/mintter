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
  type: string
  // TODO: target?: Path | Range
  target?: any
}

export interface HelperNode extends Element, HelperNodeData {}
