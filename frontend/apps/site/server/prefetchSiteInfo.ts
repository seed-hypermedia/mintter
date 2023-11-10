import {serverHelpers} from './ssr-helpers'

export async function prefetchSiteInfo(
  helpers: ReturnType<typeof serverHelpers>,
) {
  const siteInfo = await helpers.siteInfo.get.fetch()
  if (siteInfo?.groupId) {
    await helpers.group.get.prefetch({
      groupId: siteInfo.groupId,
      version: '',
    })
  }
  return siteInfo
}
