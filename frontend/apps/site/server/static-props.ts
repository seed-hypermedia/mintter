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
  const helpers = serverHelpers({})
  const siteInfo = await helpers.siteInfo.get.fetch()
  const requestGroupId = groupEid ? createHmId('g', groupEid) : siteInfo.groupId
  const prefetchedGroup = await prefetchGroup(
    helpers,
    requestGroupId,
    versionId,
  )
  await prefetchGroupContent(helpers, prefetchedGroup, pathName)
  // await new Promise<void>((resolve) => setTimeout(resolve, 2_000))
  const revalidationTimeSeconds = versionId
    ? 60 * 60 // 1 hour. doc will be unchanged but other content on the page may change
    : 20 // 20 seconds if no version, doc may have been updated
  console.log('======= Running getStaticProps.', {pathName, versionId})
  console.log('------- Revalidation time (sec):', revalidationTimeSeconds)
  return {
    props: await getPageProps(helpers, context, {}),
    revalidate: revalidationTimeSeconds,
  }
}

// export const getGroupStaticProps: GetStaticProps<EveryPageProps> = async (
//   context,
// ) => {
//   const groupEid = (context.params?.groupEid as string) || ''
//   const versionId = (context.params?.versionId as string) || ''
//   const helpers = serverHelpers({})
//   const revalidationTimeSeconds = versionId
//     ? 60 * 60 // 1 hour. doc will be unchanged but other content on the page may change
//     : 20 // 20 seconds if no version, doc may have been updated
//   return {
//     props: await getPageProps(helpers, context, {}),
//     revalidate: revalidationTimeSeconds,
//   }
// }

export const getDocStaticProps: GetStaticProps<EveryPageProps> = async (
  context,
) => {
  const docEid = (context.params?.docEid as string) || ''
  const versionId = (context.params?.versionId as string) || ''
  const helpers = serverHelpers({})
  const docId = createHmId('d', docEid)
  await impatiently(
    helpers.publication.get.prefetch({
      documentId: docId,
      versionId: versionId || '',
    }),
  )
  const revalidationTimeSeconds = versionId
    ? 60 * 60 // 1 hour. doc will be unchanged but other content on the page may change
    : 20 // 20 seconds if no version, doc may have been updated
  return {
    props: await getPageProps(helpers, context, {}),
    revalidate: revalidationTimeSeconds,
  }
}
