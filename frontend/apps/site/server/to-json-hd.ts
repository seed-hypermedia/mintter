import {
  Account,
  ChangeInfo,
  MttLink,
  Publication,
  SiteInfo,
  Group,
} from '@mintter/shared'
import {
  HDAccount,
  HDChangeInfo,
  HDPublication,
  HDSiteInfo,
  HDLink,
  HDGroup,
} from './json-hd'

export function hdPublication(input?: Publication | null) {
  if (!input) return null
  return input.toJson() as HDPublication
}

export function hdSiteInfo(input?: SiteInfo | null) {
  if (!input) return null
  return input.toJson() as HDSiteInfo
}

export function hdAccount(input?: Account | null) {
  if (!input) return null
  return input.toJson() as HDAccount
}

export function hdGroup(input?: Group | null) {
  if (!input) return null
  return input.toJson() as HDGroup
}

export function hdChangeInfo(input?: ChangeInfo | null) {
  if (!input) return null
  return input.toJson() as HDChangeInfo
}

export function hdLink(input?: MttLink) {
  if (!input) return null
  return input.toJson() as HDLink
}
