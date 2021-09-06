import type {Node, Parent} from 'unist'
import type {
  Blockquote,
  Code,
  Group,
  Heading,
  OrderedList,
  Paragraph,
  Statement,
  UnorderedList,
  Callout,
  StaticParagraph,
  Text,
  Link,
  Embed,
  Image,
  Video,
  Document,
} from '@mintter/mttast'
import {nanoid} from 'nanoid'

type ChildrenOf<N extends Parent> = N['children'] | (() => N['children'])
type OptionsOf<N extends Node> = Omit<N, 'type' | 'children'>

function normalizeChildren<P extends Parent>(children?: ChildrenOf<P>): P['children'] {
  if (Array.isArray(children)) {
    return children.filter((c) => !!c)
  } else if (typeof children == 'function') {
    const res = children()
    return normalizeChildren(res)
  } else {
    return []
  }
}

function createParent<N extends Parent>(type: N['type'], defaults: Partial<OptionsOf<N>> = {}) {
  return (optsOrKids: OptionsOf<N> | ChildrenOf<N>, kids?: ChildrenOf<N>): N =>
    ({
      type,
      ...defaults,
      ...(Array.isArray(optsOrKids) ? {} : optsOrKids),
      children: normalizeChildren(Array.isArray(optsOrKids) ? optsOrKids : kids),
    } as N)
}

function createNode<N extends Node>(type: N['type'], defaults: Partial<OptionsOf<N>> = {}) {
  return (options: OptionsOf<N>): N =>
    ({
      type,
      ...defaults,
      ...options,
    } as N)
}

export function createId() {
  return nanoid(8)
}

export const document = createParent<Document>('document', {title: '', subtitle: ''})

export const statement = createParent<Statement>('statement', {id: createId()})

export const heading = createParent<Heading>('heading', {id: createId()})

export const blockquote = createParent<Blockquote>('blockquote', {id: createId()})

export const code = createParent<Code>('code', {id: createId()})

export const callout = createParent<Callout>('callout', {id: createId()})

export const group = createParent<Group>('group')

export const ol = createParent<OrderedList>('orderedList')

export const ul = createParent<UnorderedList>('unorderedList')

export const paragraph = createParent<Paragraph>('paragraph')

export const staticParagraph = createParent<StaticParagraph>('staticParagraph')

export const link = createParent<Link>('link')

export const embed = createParent<Embed>('embed')

export const image = createNode<Image>('image')

export const video = createNode<Video>('video')

export const text = (value: string, options: Omit<Text, 'type' | 'value' | 'text'> = {}): Text => ({
  type: 'text',
  value,
  ...options,
  // get text() {
  //   return this.value
  // },
  // set text(v: string) {
  //   this.value = v
  // },
})
