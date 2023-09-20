import type {
  Account,
  Annotation,
  Block,
  BlockNode,
  ChangeInfo,
  Device,
  Document,
  Group,
  HMTimestamp,
  MttLink,
  Profile,
  Publication,
  Group_SiteInfo,
} from '@mintter/shared'

export type ServerChangeInfo = ChangeInfo
export type HMChangeInfo = {
  id?: string
  author?: string
  createTime?: HMTimestamp
  version?: string
  deps?: string[]
}

export type ServerAnnotation = Annotation
export type HMAnnotation = {
  type?: string
  ref?: string
  attributes?: {[key: string]: string}
  starts?: number[]
  ends?: number[]
}

export type ServerBlock = Block
export type HMBlock = {
  id?: string
  type?: string
  text?: string
  ref?: string
  attributes?: {[key: string]: string}
  annotations?: HMAnnotation[]
  revision?: string
}

export type ServerBlockNode = BlockNode
export type HMBlockNode = {
  block?: HMBlock
  children?: HMBlockNode[]
}

export type ServerDocument = Document
export type HMDocument = {
  title?: string
  id?: string
  author?: string
  webUrl?: string
  editors?: string[]
  children?: HMBlockNode[]
  createTime?: HMTimestamp
  updateTime?: HMTimestamp
  publishTime?: HMTimestamp
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

export type ServerGroup = Group
export type HMGroup = {
  id?: string
  title?: string
  description?: string
  ownerAccountId?: string
  createTime?: HMTimestamp
  version?: string
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
}
