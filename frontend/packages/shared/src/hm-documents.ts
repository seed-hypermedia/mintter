export type HMBlockChildrenType = 'group' | 'ol' | 'ul' | 'blockquote'

export type HMStyles = {
  bold?: true
  italic?: true
  underline?: true
  strike?: true
  code?: true
  textColor?: string
  backgroundColor?: string
}

export type ToggledStyle = {
  [K in keyof HMStyles]-?: Required<HMStyles>[K] extends true ? K : never
}[keyof HMStyles]

export type ColorStyle = {
  [K in keyof HMStyles]-?: Required<HMStyles>[K] extends string ? K : never
}[keyof HMStyles]

export type StyledText = {
  type: 'text'
  text: string
  styles: HMStyles
}

export type HMLink = {
  type: 'link'
  href: string
  content: Array<StyledText>
}

export type HMMention = {
  type: 'mention'
  ref: string
  text: string
  styles?: HMStyles
}

export type PartialLink = Omit<HMLink, 'content'> & {
  content: string | HMLink['content']
}

export type HMInlineContent = StyledText | HMLink | HMMention
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
  content: Array<HMInlineContent>
  children: Array<HMBlock>
  props: HMBlockProps
}

export type HMBlockCode = {
  type: 'code'
  id: string
  content: Array<HMInlineContent>
  children: Array<HMBlock>
  props: HMBlockProps<{
    lang?: string
  }>
}

export type HMBlockHeading = {
  type: 'heading'
  id: string
  content: Array<HMInlineContent>
  children: Array<HMBlock>
  props: HMBlockProps<{
    level: '1' | '2' | '3' | number
  }>
}
export type HMBlockImage = {
  type: 'image'
  id: string
  props: HMBlockProps<{
    url: string
    name: string
  }>
  content: Array<HMInlineContent>
  children: Array<HMBlock>
}

export type HMBlockFile = {
  type: 'file'
  id: string
  props: HMBlockProps<{
    url: string
    name: string
    size: string
  }>
  content: Array<HMInlineContent>
  children: Array<HMBlock>
}

export type HMBlockVideo = {
  type: 'video'
  id: string
  props: HMBlockProps<{
    url: string
    name: string
  }>
  content: Array<HMInlineContent>
  children: Array<HMBlock>
}

export type HMBlockEmbed = {
  type: 'embed'
  id: string
  props: HMBlockProps<{
    ref: string
  }>
  content: Array<HMInlineContent>
  children: Array<HMBlock>
}

export type HMBlock =
  | HMBlockParagraph
  | HMBlockHeading
  | HMBlockImage
  | HMBlockFile
  | HMBlockVideo
  | HMBlockEmbed
  | HMBlockCode
