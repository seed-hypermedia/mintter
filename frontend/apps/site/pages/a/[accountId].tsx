import {createHmId} from '@mintter/shared'
import AccountPage, {AccountPlaceholder} from 'account-page'
import {
  GetServerSideProps,
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next'
import {getSiteGroup} from 'server/site-info'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'

export default function Account(
  props: InferGetServerSidePropsType<typeof getServerSideProps>,
) {
  if (props.group && props.account) {
    return <AccountPage account={props.account} group={props.group} />
  }

  return <AccountPlaceholder />
}

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const {params} = context
  const {groupEid, version = ''} = await getSiteGroup()
  let accountId = params?.accountId ? String(params.accountId) : undefined
  if (!groupEid) return {notFound: true}
  if (!accountId) return {notFound: true}

  return getAccountPageProps({
    groupEid,
    version,
    context,
    accountId,
  })
}

async function getAccountPageProps({
  groupEid,
  version = '',
  context,
  accountId,
}: {
  groupEid: string
  version: string
  context: GetServerSidePropsContext
  accountId: string
}) {
  const groupId = createHmId('g', groupEid)

  const helpers = serverHelpers({})
  const {query} = context
  const groupVersion = query.v ? String(query.v) : version
  const {group} = await helpers.group.get.fetch({
    groupId,
    version: groupVersion,
  })
  const {account} = await helpers.account.get.fetch({accountId})

  await helpers.account.get.prefetch({
    accountId,
  })

  return {
    props: await getPageProps(helpers, {
      account,
      group,
    }),
  }
}
