import AccountPage from 'src/account-page'
import {GetServerSideProps, GetServerSidePropsContext} from 'next'
import {impatiently} from 'server/impatiently'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'

export default AccountPage

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const {params} = context
  let accountId = params?.accountId ? String(params.accountId) : undefined
  if (!accountId) return {notFound: true}

  const helpers = serverHelpers({})

  await impatiently(
    helpers.account.get.prefetch({
      accountId,
    }),
  )

  return {
    props: await getPageProps(helpers, context, {}),
  }
}
