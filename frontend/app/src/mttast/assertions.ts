import {isPlainObject} from 'is-plain-object'
import type {Node, Parent} from 'unist'
import type {
  Blockquote,
  Callout,
  Code,
  Content,
  Document,
  Embed,
  FlowContent,
  Group,
  GroupingContent,
  Heading,
  Image,
  Link,
  MttastContent,
  OrderedList,
  Paragraph,
  PhrasingContent,
  Statement,
  StaticContent,
  StaticParagraph,
  StaticPhrasingContent,
  Text,
  UnorderedList,
  Video,
} from './types'

const isOneOfTypes =
  <T extends MttastContent>(types: string[]) =>
  (value: unknown): value is T => {
    return isPlainObject(value) && types.includes((value as Node).type)
  }

const isType =
  <T extends MttastContent | Document>(type: string) =>
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
export const isStaticPhrasingContent = isOneOfTypes<StaticPhrasingContent>([
  'text',
  'video',
  'image',
])
export const isPhrasingContent = isOneOfTypes<PhrasingContent>([
  'text',
  'link',
  'embed',
  'video',
  'image',
])
export const isContent = isOneOfTypes<Content>(['paragraph'])
export const isStaticContent = isOneOfTypes<StaticContent>(['staticParagraph'])

export const isDocument = isType<Document>('document')
export const isGroup = isType<Group>('group')
export const isOrderedList = isType<OrderedList>('orderedList')
export const isUnorderedList = isType<UnorderedList>('unorderedList')
export const isParagraph = isType<Paragraph>('paragraph')
export const isStaticParagraph = isType<StaticParagraph>('staticParagraph')
export const isStatement = isType<Statement>('statement')
export const isHeading = isType<Heading>('heading')
export const isBlockquote = isType<Blockquote>('blockquote')
export const isCode = isType<Code>('code')
export const isCallout = isType<Callout>('callout')
export const isVideo = isType<Video>('video')
export const isImage = isType<Image>('image')
export const isEmbed = isType<Embed>('embed')
export const isLink = isType<Link>('link')
export const isText = isType<Text>('text')
