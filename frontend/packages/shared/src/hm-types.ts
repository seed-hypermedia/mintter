import type {
  Account,
  ChangeInfo,
  Device,
  Group_SiteInfo,
  MttLink,
  Profile,
  Publication,
} from '@mintter/shared'
import {HMTimestamp} from './utils'

export type ServerChangeInfo = ChangeInfo
export type HMChangeInfo = {
  id?: string
  author?: string
  createTime?: HMTimestamp
  version?: string
  deps?: string[]
}

export type ServerPublication = Publication
export type HMPublication = {
  document?: HMDocument
  version?: string
}

export type ServerGroupSiteInfo = Group_SiteInfo
export type HMGroupSiteInfo = {
  baseUrl?: string
  lastSyncTime?: HMTimestamp
  lastOkSyncTime?: HMTimestamp
  version?: string
}

export type ServerDevice = Device
export type HMDevice = {
  deviceId?: string
}

export type ServerProfile = Profile
export type HMProfile = {
  alias?: string
  bio?: string
  avatar?: string
}

export type ServerAccount = Account
export type HMAccount = {
  id?: string
  profile?: HMProfile
  devices?: {[key: string]: HMDevice}
}

export type ServerLink = MttLink
export type HMLink = {
  target?: {
    documentId?: string
    version?: string
    blockId?: string
  }
  source?: {
    documentId?: string
    version?: string
    blockId?: string
  }
  isLatest?: boolean
}

export type HMBlockChildrenType = 'group' | 'ol' | 'ul' | 'div'
export type HMEmbedDisplay = 'content' | 'card'

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

export type HMInlineContentText = {
  type: 'text'
  text: string
  styles: HMStyles
}

export type HMInlineContentLink = {
  type: 'link'
  href: string
  content: Array<HMInlineContentText>
  attributes: {
    [key: string]: any
  }
}

export type HMInlineContentEmbed = {
  type: 'inline-embed'
  ref: string
  text: string
}

export type PartialLink = Omit<HMInlineContentLink, 'content'> & {
  content: string | HMInlineContentLink['content']
}

export type HMInlineContent =
  | HMInlineContentText
  | HMInlineContentLink
  | HMInlineContentEmbed
export type PartialInlineContent = HMInlineContentText | PartialLink
export type HMBlockProps<T = unknown> = {
  childrenType?: HMBlockChildrenType
  start?: string
  textAlignment?: string
  defaultOpen?: true
} & T

export type HMBlockBase = {
  id: string
  revision?: string
  text: string
  ref?: string
  annotations: Array<TextAnnotation>
  attributes?: {
    childrenType: HMBlockChildrenType
    [key: string]: string
  }
}

export type HMBlockParagraph = HMBlockBase & {
  type: 'paragraph'
}

export type HMBlockCode = HMBlockBase & {
  type: 'code'
  attributes: HMBlockBase['attributes'] & {
    lang?: string
  }
}

export type HMBlockHeading = HMBlockBase & {
  type: 'heading'
  attributes: HMBlockBase['attributes'] & {}
}

export type HMBlockImage = HMBlockBase & {
  type: 'image'
  ref: string
}

export type HMBlockFile = HMBlockBase & {
  type: 'file'
  ref: string
  attributes: {
    name?: string
  }
}

export type HMBlockVideo = HMBlockBase & {
  type: 'video'
  ref: string
  attributes: {
    name?: string
  }
}

export type HMBlockWebEmbed = HMBlockBase & {
  type: 'web-embed'
  ref: string
}

export type HMBlockEmbed = HMBlockBase & {
  type: 'embed'
  ref: string
  attributes: {
    view?: 'content' | 'card'
  }
}

export type HMBlockCodeBlock = HMBlockBase & {
  type: 'codeBlock'
  attributes: {
    language?: string
  }
}

export type HMBlockNostr = HMBlockBase & {
  type: 'nostr'
  ref: string
  attributes: {
    name?: string
    text?: string
  }
}

export type HMBlock =
  | HMBlockParagraph
  | HMBlockHeading
  | HMBlockImage
  | HMBlockFile
  | HMBlockVideo
  | HMBlockWebEmbed
  | HMBlockEmbed
  | HMBlockCode
  | HMBlockCodeBlock
  | HMBlockNostr

export type HMBlockNode = {
  block: HMBlock
  children?: Array<HMBlockNode>
}

export type HMDocument = {
  title?: string
  id?: string
  author?: string
  webUrl?: string
  editors?: Array<string>
  children?: Array<HMBlockNode>
  createTime?: HMTimestamp
  updateTime?: HMTimestamp
  publishTime?: HMTimestamp
}

export type HMGroup = {
  id?: string
  title?: string
  description?: string
  ownerAccountId?: string
  createTime?: HMTimestamp
  version?: string
}

export type HMComment = {
  id: string
  target?: string
  repliedComment?: string
  author?: string
  content?: Array<HMBlockNode>
  createTime?: HMTimestamp
}

export type InlineEmbedAnnotation = BaseAnnotation & {
  type: 'inline-embed'
  ref: string // 'hm://... with #BlockRef
  attributes: {}
}

type BaseAnnotation = {
  starts: number[]
  ends: number[]
  // attributes: {}
}

export type StrongAnnotation = BaseAnnotation & {
  type: 'strong'
}

export type EmphasisAnnotation = BaseAnnotation & {
  type: 'emphasis'
}

export type UnderlineAnnotation = BaseAnnotation & {
  type: 'underline'
}

export type StrikeAnnotation = BaseAnnotation & {
  type: 'strike'
}

export type CodeAnnotation = BaseAnnotation & {
  type: 'code'
}

export type LinkAnnotation = BaseAnnotation & {
  type: 'link'
  ref: string
}

export type ColorAnnotation = BaseAnnotation & {
  type: 'color'
  attributes: {
    color: string
  }
}

export type RangeAnnotation = BaseAnnotation & {
  type: 'range'
}

export type TextAnnotation =
  | LinkAnnotation
  | StrongAnnotation
  | EmphasisAnnotation
  | CodeAnnotation
  | UnderlineAnnotation
  | StrikeAnnotation
  | ColorAnnotation
  | InlineEmbedAnnotation
  | RangeAnnotation

export type HMCommentDraft = {
  blocks: HMBlockNode[]
  targetDocEid: string
  targetDocVersion: string
  targetCommentId: string | null
  publishTime: number | null
  commentId: string
}
