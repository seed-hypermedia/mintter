export type HMBlockChildrenType = 'group' | 'ol' | 'ul' | 'blockquote'

export type Styles = {
  bold?: true
  italic?: true
  underline?: true
  strike?: true
  code?: true
  textColor?: string
  backgroundColor?: string
}

export type ToggledStyle = {
  [K in keyof Styles]-?: Required<Styles>[K] extends true ? K : never
}[keyof Styles]

export type ColorStyle = {
  [K in keyof Styles]-?: Required<Styles>[K] extends string ? K : never
}[keyof Styles]

export type StyledText = {
  type: 'text'
  text: string
  styles: Styles
}

export type Link = {
  type: 'link'
  href: string
  content: Array<StyledText>
}

export type Mention = {
  type: 'mention'
  ref: string
  text: string
}

export type PartialLink = Omit<Link, 'content'> & {
  content: string | Link['content']
}

export type InlineContent = StyledText | Link | Mention
export type PartialInlineContent = StyledText | PartialLink
export type HMBlockProps<T = unknown> = {
  childrenType?: HMBlockChildrenType
  start?: string
  textAlignment?: string
  defaultOpen?: true
} & T

export type HMBlockParagraph = {
  type: 'paragraph'
  id: string
  content: Array<InlineContent>
  children: Array<HMBlock>
  props: HMBlockProps<{
    type: 'p'
  }>
}
export type HMBlockHeading = {
  type: 'heading'
  id: string
  content: InlineContent[]
  children: HMBlock[]
  props: HMBlockProps<{
    level: '1' | '2' | '3'
  }>
}
export type HMBlockImage = {
  type: 'image'
  id: string
  props: HMBlockProps<{
    url: string
    name: string
  }>
  content: InlineContent[]
  children: HMBlock[]
}

export type HMBlockFile = {
  type: 'file'
  id: string
  props: HMBlockProps<{
    url: string
    name: string
    size: string
  }>
  children: Array<HMBlock>
}

export type HMBlockVideo = {
  type: 'video'
  id: string
  props: HMBlockProps<{
    url: string
    name: string
  }>
  content: Array<InlineContent>
  children: Array<HMBlock>
}

export type HMBlockEmbed = {
  type: 'embed'
  id: string
  props: HMBlockProps<{
    ref: string
  }>
  children: Array<HMBlock>
}

export type HMBlock =
  | HMBlockParagraph
  | HMBlockHeading
  | HMBlockImage
  | HMBlockFile
  | HMBlockVideo
  | HMBlockEmbed
