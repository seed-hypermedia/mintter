import type {Node, Parent} from 'unist'
import type {
  Blockquote,
  Code,
  Group,
  Header,
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
} from 'mttast'

type ChildrenOf<N extends Parent> = N['children'] | (() => N['children'])
type OptionsOf<N extends Node> = Omit<N, 'type' | 'children'> & Record<string, unknown>

function normalizeChildren<P extends Parent>(children?: ChildrenOf<P>): P['children'] {
  if (Array.isArray(children)) {
    return children.filter((c) => !!c)
  } else if (typeof children === 'function') {
    const res = children()
    return normalizeChildren(res)
  } else {
    return []
  }
}

function createParent<N extends Parent>(type: N['type']) {
  return (optsOrKids: OptionsOf<N> | ChildrenOf<N>, kids?: ChildrenOf<N>): N =>
    ({
      type,
      ...(kids ? optsOrKids : {}),
      children: normalizeChildren(kids),
    } as N)
}

function createNode<N extends Node>(type: N['type']) {
  return (options: OptionsOf<N>): N =>
    ({
      type,
      ...options,
    } as N)
}

export const document = createParent<Document>('document')

export const statement = createParent<Statement>('statement')

export const header = createParent<Header>('header')

export const blockquote = createParent<Blockquote>('blockquote')

export const code = createParent<Code>('code')

export const callout = createParent<Callout>('callout')

export const group = createParent<Group>('group')

export const ol = createParent<OrderedList>('orderedList')

export const ul = createParent<UnorderedList>('unorderedList')

export const paragraph = createParent<Paragraph>('paragraph')

export const staticParagraph = createParent<StaticParagraph>('staticParagraph')

export const link = createNode<Link>('link')

export const embed = createNode<Embed>('embed')

export const image = createNode<Image>('image')

export const video = createNode<Video>('video')

export const text = (value: string, options: Omit<Text, 'type' | 'value' | 'text'> = {}): Text => ({
  type: 'text',
  value,
  ...options,
  get text() {
    return this.value
  },
  set text(v: string) {
    this.value = v
  },
})
