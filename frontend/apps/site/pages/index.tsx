import {GetServerSideProps} from 'next'
import {EveryPageProps} from './_app'
import GroupPage from './g/[groupEid]'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'
import {prefetchGroup} from 'server/group'
import {trpc} from 'src/trpc'
import {ErrorPage} from 'src/error-page'
import {GroupPageProps} from 'src/group-page'

export default function HomePage({}: GroupPageProps) {
  const siteInfo = trpc.siteInfo.get.useQuery()

  if (siteInfo.data?.groupId) {
    return <GroupPage />
  }
  return (
    <ErrorPage
      title="Your site is ready to launch"
      description="Use the secret setup URL to publish your group to this new site."
    />
  )
}

export const getServerSideProps: GetServerSideProps<EveryPageProps> = async (
  context,
) => {
  const helpers = serverHelpers({})
  const version = (context.params?.v as string) || ''
  const siteInfo = await helpers.siteInfo.get.fetch()
  await prefetchGroup(helpers, siteInfo.groupId, version)
  return {props: await getPageProps(helpers, context, {})}
}
