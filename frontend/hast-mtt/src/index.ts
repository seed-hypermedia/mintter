import {MttastContent, Text} from '@mintter/mttast'
import deepmerge from 'deepmerge'
import minifyWhiteSpace from 'rehype-minify-whitespace'
import {defaultSchema} from 'rehype-sanitize'
import {Processor} from 'unified'
import {u} from 'unist-builder'
import {removePosition} from 'unist-util-remove-position'
import {visit} from 'unist-util-visit'
import {handlers} from './handlers'
import {one} from './one'
import {Context, HastNode, Properties} from './types'

export const sanitizeSchema: typeof defaultSchema = deepmerge(defaultSchema, {strip: ['title'], tagNames: ['u']})

type Destination = Processor
export type Options = Partial<Context>

export type MttRoot = {
  type: 'root'
  children: Array<MttastContent>
}

export function toMttast(tree: HastNode | any, options: Options = {}): MttRoot {
  let mttast
  const h = Object.assign<any, any>(transformer, {
    handlers,
    wrapText: true,
    textProps: {},
    frozenBaseUrl: null,
    baseFound: false,
    ...options,
  } as Context)

  // this removes all the text nodes with just line breaks (\n)
  // @ts-ignore
  minifyWhiteSpace({newlines: false})(tree)

  let result = one(h, tree, undefined)

  if (!result) {
    mttast = u('root', [])
  } else if (Array.isArray(result)) {
    mttast = u('root', result)
  } else {
    mttast = result
  }

  visit(mttast, 'text', ontext)

  removePosition(mttast, true)
  return mttast
}
function transformer(
  node: HastNode,
  type: string,
  props?: string | Array<any> | Properties,
  children?: string | Array<any>,
): MttastContent {
  let properties: Properties | undefined

  if (typeof props == 'string' || Array.isArray(props)) {
    children = props
    properties = {}
  } else {
    properties = props
  }

  let result: any = {type, ...properties}

  if (typeof children == 'string') {
    result.value = children
  } else if (children) {
    result.children = children
  }

  // if (node.position) {
  //   result.position = node.position
  // }

  return result
}

function ontext(node: Text, index: number | null, parent: {children: any[]}) {
  if (index == null || !parent) return
  let previousIndex = index - 1
  const previous = parent.children[previousIndex]

  if (previous && hasSameProps(previous, node)) {
    previous.value += node.value
    parent.children.splice(index, 1)

    // if (previous.position && node.position) {
    //   previous.position.end = node.position.end
    // }

    // Iterate over the previous node again, to handle its total value.
    return index - 1
  }

  node.value = node.value.replace(/[\t ]*(\r?\n|\r)[\t ]*/, '$1')

  // We don’t care about other phrasing nodes in between (e.g., `[ asd ]()`),
  // as there the whitespace matters.
  // if (parent && block(parent)) {
  //   if (!index) {
  //     node.value = node.value.replace(/^[\t ]+/, '')
  //   }

  //   if (index === parent.children.length - 1) {
  //     node.value = node.value.replace(/[\t ]+$/, '')
  //   }
  // }

  // if (!node.value) {
  //   parent.children.splice(index, 1)
  //   return index
  // }
}

function hasSameProps(one: Text, two: Text): boolean {
  const {value: n1, ...props1} = one
  const {value: n2, ...props2} = two
  return JSON.stringify(props1) === JSON.stringify(props2)
}

export function rehypeMtt(destination?: Destination, options: Options = {}) {
  return destination && 'run' in destination ? bridge(destination, options) : mutate(destination || options)
}

function bridge(destination: Destination, options: Options = {}) {
  console.warn(`rehypeMtt: "bridge" mode is not supported (yet)`)
  return destination
}

function mutate(options: Options) {
  return function mutateNode(node: HastNode) {
    return toMttast(node, options)
  }
}
