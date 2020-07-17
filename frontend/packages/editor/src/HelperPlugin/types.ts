import {RenderElementOptions} from '@udecode/slate-plugins-core'
import {Element} from 'slate'
import {RenderElementProps} from 'slate-react'

export interface useHelperOptions {
  trigger?: string
}

export interface HelperNodeData {
  value: string
  [key: string]: any
}

export HelperNode extends Element, HelperNodeData {}


