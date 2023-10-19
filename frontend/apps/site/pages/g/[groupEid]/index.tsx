import {createHmId} from '@mintter/shared'
import {GetServerSideProps, GetServerSidePropsContext} from 'next'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'
import {GroupPage} from 'src/group-page'
import {prefetchGroup} from '../../../server/group'

export default GroupPage

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const {params, query} = context
  const groupEid = params?.groupEid ? String(params.groupEid) : undefined
  const version = query.v ? String(query.v) : ''
  if (!groupEid) return {notFound: true}
  const groupId = createHmId('g', groupEid)
  const helpers = serverHelpers({})
  await prefetchGroup(helpers, groupId, version)

  return {props: await getPageProps(helpers, context, {})}
}
