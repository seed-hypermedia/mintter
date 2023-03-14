import {SiteInfo} from '@mintter/shared'
import {localWebsiteClient} from './client'

export async function getSiteTitle() {
  const info = await getSiteInfo()
  if (info) {
    return info.title
  }
  return null
}

export async function getSiteInfo() {
  if (process.env.GW_NEXT_HOST) {
    try {
      let info: SiteInfo = await localWebsiteClient.getSiteInfo({})
      return info
    } catch (error) {
      return null
    }
  }
  return null
}
