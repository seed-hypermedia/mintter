import AccountPage from 'account-page'
import {
  GetServerSideProps,
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'

export default function Account(
  props: InferGetServerSidePropsType<typeof getServerSideProps>,
) {
  return <AccountPage accountId={props.accountId} />
}

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const {params, query} = context
  let accountId = params?.accountId ? String(params.accountId) : undefined
  if (!accountId) return {notFound: true}

  const helpers = serverHelpers({})

  await helpers.account.get.prefetch({
    accountId,
  })

  return {
    props: await getPageProps(helpers, {
      accountId,
    }),
  }
}
