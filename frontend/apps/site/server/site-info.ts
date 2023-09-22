import {unpackHmId} from '@mintter/shared'
import {websiteClient} from '../client'

export async function getSiteGroup(): Promise<{
  groupEid?: string
  version?: string | null
}> {
  const siteInfo = await websiteClient.getSiteInfo({})
  const groupId = unpackHmId(siteInfo.groupId || '')
  return {
    groupEid: groupId?.eid || undefined,
    version: siteInfo.groupVersion || null,
  }
}
