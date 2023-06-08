import {isPlainObject} from 'is-plain-object'
import type {Node, Parent} from 'unist'
import type {
  Blockquote,
  Code,
  Content,
  Embed,
  FlowContent,
  Group,
  GroupingContent,
  Heading,
  Image,
  File,
  Link,
  Mark,
  MttastContent,
  MttDocument,
  OrderedList,
  Paragraph,
  // PhrasingContent,
  Statement,
  StaticContent,
  StaticParagraph,
  // Text,
  UnorderedList,
  Video,
} from './types'

const isOneOfTypes =
  <T extends MttastContent>(types: string[]) =>
  (value: unknown): value is T => {
    return isPlainObject(value) && types.includes((value as Node).type)
  }

const isType =
  <T extends MttastContent | MttDocument>(type: string) =>
  (value: unknown): value is T => {
    return isPlainObject(value) && (value as Node).type == type
  }
export const isParent = (value: unknown): value is Parent =>
  isPlainObject(value) &&
  typeof (value as Parent).type === 'string' &&
  Array.isArray((value as Parent).children)

export const isFlowContent = isOneOfTypes<FlowContent>([
  'statement',
  'blockquote',
  'heading',
  'code',
  'callout',
])
export const isGroupContent = isOneOfTypes<GroupingContent>([
  'group',
  'orderedList',
  'unorderedList',
])

export const isPhrasingContent = <T extends MttastContent>(
  value: unknown,
): value is T => {
  return (
    (isPlainObject(value) &&
      ['text', 'link', 'embed'].includes((value as Node).type)) ||
    (isPlainObject(value) && isPlainText(value))
  )
}

function isPlainText(value: any) {
  return typeof value.text == 'string' && typeof value.type == 'undefined'
}

export const isContent = isOneOfTypes<Content>(['paragraph', 'staticParagraph'])
export const isMedia = isOneOfTypes<Content>(['image', 'video', 'file'])
export const isStaticContent = isOneOfTypes<StaticContent>(['staticParagraph'])

export const isDocument = isType<MttDocument>('document')
export const isGroup = isType<Group>('group')
export const isOrderedList = isType<OrderedList>('orderedList')
export const isUnorderedList = isType<UnorderedList>('unorderedList')
export const isParagraph = isType<Paragraph>('paragraph')
export const isStaticParagraph = isType<StaticParagraph>('staticParagraph')
export const isStatement = isType<Statement>('statement')
export const isHeading = isType<Heading>('heading')
export const isBlockquote = isType<Blockquote>('blockquote')
export const isCode = isType<Code>('code')
export const isVideo = isType<Video>('video')
export const isImage = isType<Image>('image')
export const isFile = isType<File>('file')
export const isEmbed = isType<Embed>('embed')
export const isLink = isType<Link>('link')
export const isText = (value: any) =>
  isPlainObject(value) && typeof value.text == 'string'

export const isMark = (maybeMark: string): maybeMark is Mark => {
  return [
    'strong',
    'emphasis',
    'underline',
    'strikethrough',
    'superscript',
    'subscript',
    'code',
    'color',
    'conversations',
  ].includes(maybeMark)
}
