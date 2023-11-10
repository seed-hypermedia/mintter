import type {
  Account,
  ChangeInfo,
  Device,
  Group_SiteInfo,
  HMDocument,
  HMTimestamp,
  MttLink,
  Profile,
  Publication,
} from '@mintter/shared'

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
}
