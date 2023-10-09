import {GetServerSideProps} from 'next'
import {EveryPageProps} from './_app'
import GroupPublicationPage from './g/[groupEid]/[pathName]'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'
import {prefetchGroup, prefetchGroupContent} from 'server/group'

export default GroupPublicationPage

export const getServerSideProps: GetServerSideProps<EveryPageProps> = async (
  context,
) => {
  const pathName = (context.params?.pathName as string) || ''
  const helpers = serverHelpers({})

  const version = (context.params?.v as string) || ''
  const siteInfo = await helpers.siteInfo.get.fetch()

  const prefetchedGroup = await prefetchGroup(
    helpers,
    siteInfo.groupId,
    version,
  )
  const pub = await prefetchGroupContent(helpers, prefetchedGroup, pathName)

  return {props: await getPageProps(helpers, context, {})}
}
