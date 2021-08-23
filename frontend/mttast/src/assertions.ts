import {isPlainObject} from 'is-plain-object'
import type {
  Blockquote,
  Callout,
  Code,
  Content,
  Document,
  Embed,
  EmbeddedContent,
  FlowContent,
  Group,
  GroupingContent,
  Heading,
  Link,
  OrderedList,
  Paragraph,
  PhrasingContent,
  Statement,
  StaticContent,
  StaticParagraph,
  StaticPhrasingContent,
  UnorderedList,
  Image,
  Video,
  Text,
} from './types'

const isOneOfTypes =
  <T extends unknown>(types: string[]) =>
  (value: unknown): value is T => {
    return isPlainObject(value) && types.includes((value as Record<string, string>).type)
  }

const isType =
  <T extends unknown>(type: string) =>
  (value: unknown): value is T => {
    return isPlainObject(value) && (value as Record<string, unknown>).type === type
  }

export const isFlowContent = isOneOfTypes<FlowContent>(['blockquote', 'heading', 'statement'])

export const isGroupContent = isOneOfTypes<GroupingContent>(['group', 'orderedList', 'unorderedList'])

export const isEmbeddedContent = isOneOfTypes<EmbeddedContent>(['embed', 'video', 'image'])

export const isStaticPhrasingContent = isOneOfTypes<StaticPhrasingContent>(['text'])

export const isPhrasingContent = isOneOfTypes<PhrasingContent>(['text', 'link'])

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
