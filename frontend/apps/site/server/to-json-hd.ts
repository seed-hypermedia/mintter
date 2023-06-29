import {Account, Publication, SiteInfo} from '@mintter/shared'
import {HDAccount, HDPublication, HDSiteInfo} from './json-hd'

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
