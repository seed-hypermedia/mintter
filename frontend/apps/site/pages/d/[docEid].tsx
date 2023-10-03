import {createHmId} from '@mintter/shared'
import {
  GetServerSideProps,
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next'
import PublicationPage from 'publication-page'
import {impatiently} from 'server/impatiently'
import {useRequiredRouteQuery, useRouteQuery} from 'server/router-queries'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'

export default function IDPublicationPage(
  props: InferGetServerSidePropsType<typeof getServerSideProps>,
) {
  return (
    <PublicationPage
      contextGroup={props.group}
      documentId={createHmId('d', useRequiredRouteQuery('docEid'))}
      version={useRouteQuery('v')}
    />
  )
}

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const {params, query} = context
  let docEid = params?.docEid ? String(params.docEid) : undefined
  if (!docEid) return {notFound: true}
  let version = query.v ? String(query.v) : ''
  const helpers = serverHelpers({})
  const docId = createHmId('d', docEid)

  await impatiently(
    helpers.publication.get.prefetch({
      documentId: docId,
      versionId: version || '',
    }),
  )

  return {
    props: await getPageProps(helpers, context, {}),
  }
}
