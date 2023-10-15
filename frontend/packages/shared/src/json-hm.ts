import type {
  Account,
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

export type ServerDocument = Document
export type ServerPublication = Publication

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
