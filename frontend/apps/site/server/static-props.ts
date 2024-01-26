import {createHmId} from '@mintter/shared'
import {GetStaticPaths, GetStaticProps} from 'next'
import {EveryPageProps} from 'pages/_app'
import {prefetchGroup, prefetchGroupContent} from 'server/group'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'
import {impatiently} from './impatiently'

export const siteGetStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export type SiteGetStaticProps = GetStaticProps<EveryPageProps>

export const getGroupDocStaticProps: GetStaticProps<EveryPageProps> = async (
  context,
) => {
  const pathName = (context.params?.pathName as string) || '-'
  const versionId = (context.params?.versionId as string) || ''
  const groupEid = (context.params?.groupEid as string) || ''
  const {helpers, siteInfo} = await getSiteServerHelpers()
  if (!siteInfo) {
    return {
      props: await getPageProps(helpers, context, {}),
      revalidate: 1,
    }
  }
  const requestGroupId = groupEid ? createHmId('g', groupEid) : siteInfo.groupId
  const prefetchedGroup = await prefetchGroup(
    helpers,
    requestGroupId,
    versionId,
  )
  const pub = await prefetchGroupContent(helpers, prefetchedGroup, pathName)
  const versionRevalidationTime = pub?.document
    ? 60 * 60 // 1 hour. doc will be unchanged but other content on the page may change
    : 10 // 10 seconds because maybe the doc will load next time
  const revalidationTimeSeconds = versionId ? versionRevalidationTime : 20 // 20 seconds if no version, doc may have been updated
  return {
    props: await getPageProps(helpers, context, {}),
    revalidate: revalidationTimeSeconds,
  }
}

export async function getSiteServerHelpers() {
  const helpers = serverHelpers({})
  try {
    const siteInfo = await helpers.siteInfo.get.fetch()
    return {helpers, siteInfo}
  } catch (e) {
    console.error('Error fetching site info', e)
  }
  return {helpers, siteInfo: undefined}
}

export const getDocStaticProps: GetStaticProps<EveryPageProps> = async (
  context,
) => {
  const docEid = (context.params?.docEid as string) || ''
  const versionId = (context.params?.versionId as string) || ''
  const {helpers} = await getSiteServerHelpers()
  const docId = createHmId('d', docEid)
  const loadedDoc = await helpers.publication.get.fetch({
    documentId: docId,
    versionId: versionId || '',
  })
  const versionRevalidationTime = loadedDoc.publication?.document
    ? 60 * 60 // 1 hour. doc will be unchanged but other content on the page may change
    : 10 // 10 seconds because maybe the doc will load next time
  const revalidationTimeSeconds = versionId ? versionRevalidationTime : 20 // 20 seconds if no version, doc may have been updated
  return {
    props: await getPageProps(helpers, context, {}),
    revalidate: revalidationTimeSeconds,
  }
}

export const getAccountStaticProps: GetStaticProps<EveryPageProps> = async (
  context,
) => {
  const params = context.params
  let accountId = params?.accountId ? String(params.accountId) : undefined
  const {helpers} = await getSiteServerHelpers()
  await impatiently(
    helpers.account.get.prefetch({
      accountId,
    }),
  )
  return {
    props: await getPageProps(helpers, context, {}),
    revalidate: 30 * 60, // 30 minutes, content doesn't change very often with this account page design
  }
}
