import {createHyperscript} from 'slate-hyperscript'
import type {Parent} from 'unist'
import {
  code,
  group,
  image,
  link,
  paragraph,
  statement,
  text,
  video,
  ol,
  ul,
  staticParagraph,
  heading,
  blockquote,
  callout,
  embed,
} from '@mintter/mttast-builder'
import type {
  Group,
  OrderedList,
  UnorderedList,
  Code,
  Image,
  Link,
  Paragraph,
  Statement,
  Text,
  Video,
  StaticParagraph,
  Heading,
  Blockquote,
  Callout,
  Embed,
} from '@mintter/mttast'

type JSXCompliant<T extends Parent> = Omit<T, 'type' | 'children'> & {
  children?: T['children']
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
      anchor: any
      cursor: any
      editor: any
      element: any
      focus: any
      fragment: any
      selection: any
      group: JSXCompliant<Group>
      unorderedList: JSXCompliant<UnorderedList>
      orderedList: JSXCompliant<OrderedList>
      paragraph: JSXCompliant<Paragraph>
      staticParagraph: JSXCompliant<StaticParagraph>
      statement: JSXCompliant<Statement>
      heading: JSXCompliant<Heading>
      blockquote: JSXCompliant<Blockquote>
      code: JSXCompliant<Code>
      callout: JSXCompliant<Callout>
      video: Omit<Video, 'type'>
      image: Omit<Image, 'type'>
      embed: JSXCompliant<Embed>
      link: JSXCompliant<Link>
      text: Omit<Text, 'type' | 'text'> & {children: string}
    }
  }
}

export const jsx = createHyperscript({
  elements: {
    group: group([]),
    unorderedList: ul([]),
    orderedList: ol([]),
    paragraph: paragraph([]),
    staticParagraph: staticParagraph([]),
    statement: statement([]),
    heading: heading([]),
    blockquote: blockquote([]),
    code: code([]),
    callout: callout([]),
    embed: embed({url: ''}, []),
    link: link({url: ''}, []),
  },
  creators: {
    text: (_, a, c) => text(c[0], a),
    image: (_, a) => image(a as any),
    video: (_, a) => video(a as any),
  },
})
