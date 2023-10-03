import {GetServerSideProps} from 'next'
import {EveryPageProps} from './_app'
import GroupPage from './g/[groupEid]'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'
import {getGroupView, prefetchGroup} from 'server/group'

export default GroupPage

export const getServerSideProps: GetServerSideProps<EveryPageProps> = async (
  context,
) => {
  const helpers = serverHelpers({})

  const version = (context.params?.v as string) || ''
  const view = getGroupView(context.query.view as string)
  const siteInfo = await helpers.siteInfo.get.fetch()

  await prefetchGroup(helpers, siteInfo.groupId, version, view)

  return {props: await getPageProps(helpers, context, {})}
}
