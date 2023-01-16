import {nanoid} from 'nanoid/non-secure'
import type {Node, Parent} from 'unist'
import type {
  Blockquote,
  Callout,
  Code,
  Document,
  Embed,
  Group,
  Heading,
  Image,
  Link,
  OrderedList,
  Paragraph,
  Statement,
  StaticParagraph,
  Text,
  UnorderedList,
  Video,
} from './types'

export type ChildrenOf<N extends Parent> = N['children'] | (() => N['children'])
export type OptionsOf<N extends Node> = Omit<N, 'type' | 'children'>

function normalizeChildren<P extends Parent>(
  children?: ChildrenOf<P>,
): P['children'] {
  if (Array.isArray(children)) {
    return children.filter((c) => !!c)
  } else if (typeof children == 'function') {
    const res = children()
    return normalizeChildren(res)
  } else {
    return []
  }
}

function createParent<N extends Parent>(
  type: N['type'],
  defaults: Partial<OptionsOf<N>> = {},
) {
  //@ts-ignore

  return function createblockType(
    optsOrKids: OptionsOf<N> | ChildrenOf<N>,
    kids?: ChildrenOf<N>,
  ): N {
    return {
      type,
      ...defaults,
      ...(Array.isArray(optsOrKids) ? {} : optsOrKids),
      children: normalizeChildren(
        Array.isArray(optsOrKids) ? optsOrKids : kids,
      ),
    } as N
  }
}

export function createId() {
  let id = nanoid(8)
  return id
}

export const document = createParent<Document>('document', {
  title: '',
  subtitle: '',
})

export const statement = createParent<Statement>('statement', {id: createId()})

export const heading = createParent<Heading>('heading', {id: createId()})

export const blockquote = createParent<Blockquote>('blockquote', {
  id: createId(),
})

export const code = createParent<Code>('code', {id: createId()})

export const callout = createParent<Callout>('callout', {id: createId()})

export const group = createParent<Group>('group')

export const ol = createParent<OrderedList>('orderedList')

export const ul = createParent<UnorderedList>('unorderedList')

export const paragraph = createParent<Paragraph>('paragraph')

export const staticParagraph = createParent<StaticParagraph>('staticParagraph')

export const link = createParent<Link>('link')

export const embed = createParent<Embed>('embed')

export const image = createParent<Image>('image')

export const video = createParent<Video>('video')

export const text = (
  text: string,
  options: Omit<Text, 'type' | 'text'> = {},
): Text => ({
  type: 'text',
  text,
  ...options,
})

export function ObjectKeys<Obj extends object>(obj: Obj): (keyof Obj)[] {
  return Object.keys(obj) as (keyof Obj)[]
}
