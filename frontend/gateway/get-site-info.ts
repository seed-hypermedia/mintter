import {SiteInfo} from '@mintter/shared'
import {localWebsiteClient} from './client'

export async function getSiteTitle() {
  if (process.env.GW_NEXT_HOST) {
    try {
      let info: SiteInfo = await localWebsiteClient.getSiteInfo({})
      console.log('🚀 ~ file: get-site-info.ts:7 ~ getSiteTitle ~ info:', info)
      if (info) {
        return info.title as string
      }
      return null
    } catch (error) {
      return null
    }
  }
  return null
}
