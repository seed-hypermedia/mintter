import type {
  Account,
  Annotation,
  Block,
  BlockNode,
  Device,
  Document,
  Profile,
  Publication,
  SiteInfo,
  HDTimestamp,
  ChangeInfo,
  MttLink,
  Group,
} from '@mintter/shared'

export type ServerChangeInfo = ChangeInfo
export type HDChangeInfo = {
  id?: string
  author?: string
  createTime?: HDTimestamp
  version?: string
  deps?: string[]
}

export type ServerAnnotation = Annotation
export type HDAnnotation = {
  type?: string
  ref?: string
  attributes?: {[key: string]: string}
  starts?: number[]
  ends?: number[]
}

export type ServerBlock = Block
export type HDBlock = {
  id?: string
  type?: string
  text?: string
  ref?: string
  attributes?: {[key: string]: string}
  annotations?: HDAnnotation[]
  revision?: string
}

export type ServerBlockNode = BlockNode
export type HDBlockNode = {
  block?: HDBlock
  children?: HDBlockNode[]
}

export type ServerDocument = Document
export type HDDocument = {
  title?: string
  id?: string
  author?: string
  webUrl?: string
  editors?: string[]
  children?: HDBlockNode[]
  createTime?: HDTimestamp
  updateTime?: HDTimestamp
  publishTime?: HDTimestamp
}

export type ServerPublication = Publication
export type HDPublication = {
  document?: HDDocument
  version?: string
}

export type ServerSiteInfo = SiteInfo
export type HDSiteInfo = {
  hostname?: string
  title?: string
  description?: string
  owner?: string
}

export type ServerDevice = Device
export type HDDevice = {
  deviceId?: string
}

export type ServerProfile = Profile
export type HDProfile = {
  alias?: string
  bio?: string
  avatar?: string
}

export type ServerAccount = Account
export type HDAccount = {
  id?: string
  profile?: HDProfile
  devices?: {[key: string]: HDDevice}
}

export type ServerGroup = Group
export type HDGroup = {
  id?: string
  title?: string
  description?: string
  ownerAccountId?: string
  createTime?: HDTimestamp
  version?: string
}

export type ServerLink = MttLink
export type HDLink = {
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
