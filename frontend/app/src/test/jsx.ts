import type {
  Blockquote,
  Callout,
  Code,
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
  Video
} from '@mintter/mttast'
import {
  blockquote,
  callout,
  code,
  embed,
  group,
  heading,
  image,
  link,
  ol,
  paragraph,
  statement,
  staticParagraph,
  text,
  ul,
  video
} from '@mintter/mttast'
import { createHyperscript } from 'slate-hyperscript'
import type { Parent } from 'unist'

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
      mttblockquote: JSXCompliant<Blockquote>
      mttcode: JSXCompliant<Code>
      callout: JSXCompliant<Callout>
      mttvideo: Omit<Video, 'type'>
      mttimage: Omit<Image, 'type'>
      mttembed: JSXCompliant<Embed>
      mttlink: JSXCompliant<Link>
      mtttext: Omit<Text, 'type' | 'text'> & { children: string }
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
    embed: embed({ url: '' }, []),
    link: link({ url: '' }, []),
  },
  creators: {
    text: (_, a, c) => text(c[0], a),
    image: (_, a) => image(a as any),
    video: (_, a) => video(a as any),
  },
})
