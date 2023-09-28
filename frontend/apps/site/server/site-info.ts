import {unpackHmId} from '@mintter/shared'
import {websiteClient} from '../client'

export async function getSiteGroup(): Promise<{
  groupEid?: string
  version: string
}> {
  const siteInfo = await websiteClient.getSiteInfo({})
  const groupId = unpackHmId(siteInfo.groupId || '')
  return {
    groupEid: groupId?.eid || '',
    version: '',
  }
}
