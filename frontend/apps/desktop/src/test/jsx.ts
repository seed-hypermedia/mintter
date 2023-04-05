/* eslint-disable */

import {MintterEditor} from '@app/editor/mintter-changes/plugin'
import {
  Blockquote,
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
  Video,
  blockquote,
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
  video,
} from '@mintter/shared'
import {createEditor} from 'slate'
import {createHyperscript} from 'slate-hyperscript'
import type {Parent} from 'unist'

type JSXCompliant<T extends Parent> = Omit<T, 'type' | 'children'> & {
  children?: T['children']
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      [key: string]: any
      anchor: any
      cursor: any
      editor: MintterEditor
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
      mttvideo: Omit<Video, 'type'>
      mttimage: Omit<Image, 'type'>
      mttembed: JSXCompliant<Embed>
      mttlink: JSXCompliant<Link>
      mtttext: Omit<Text, 'type' | 'text'> & {children: string}
    }
  }
}

export const jsx = createHyperscript({
  elements: {
    editor: {...createEditor(), __mtt_changes: []},
    group: group([]),
    unorderedList: ul([]),
    orderedList: ol([]),
    paragraph: paragraph([]),
    staticParagraph: staticParagraph([]),
    //@ts-ignore
    statement: statement([]),
    //@ts-ignore
    heading: heading([]),
    //@ts-ignore
    blockquote: blockquote([]),
    //@ts-ignore
    code: code([]),
    embed: embed({url: ''}, []),
    link: link({url: ''}, []),
  },
  creators: {
    text: (_, a, c) => text(c[0], a),
    image: (_, a) => image(a as any),
    video: (_, a) => video(a as any),
  },
})
