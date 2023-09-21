import {websiteClient} from '../client'

export async function getSiteGroup(): Promise<{
  groupEid?: string
  version?: string | null
}> {
  const siteInfo = await websiteClient.getSiteInfo({})
  return {
    groupEid: siteInfo.groupId || undefined,
    version: siteInfo.groupVersion || null,
  }
}
