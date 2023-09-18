import {Account, ChangeInfo, Group, MttLink, Publication} from '@mintter/shared'
import {
  HMAccount,
  HMChangeInfo,
  HMGroup,
  HMLink,
  HMPublication,
} from './json-hm'

export function hmPublication(input?: Publication | null) {
  if (!input) return null
  return input.toJson() as HMPublication
}

export function hmAccount(input?: Account | null) {
  if (!input) return null
  return input.toJson() as HMAccount
}

export function hmGroup(input?: Group | null) {
  if (!input) return null
  return input.toJson() as HMGroup
}

export function hmChangeInfo(input?: ChangeInfo | null) {
  if (!input) return null
  return input.toJson() as HMChangeInfo
}

export function hmLink(input?: MttLink) {
  if (!input) return null
  return input.toJson() as HMLink
}
