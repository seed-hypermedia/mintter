import {createHmId} from '@mintter/shared'
import {
  GetServerSideProps,
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next'
import PublicationPage from 'publication-page'
import {setAllowAnyHostGetCORS} from 'server/cors'
import {useRequiredRouteQuery, useRouteQuery} from 'server/router-queries'
import {getSiteGroup} from 'server/site-info'
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
  const {groupEid, version: groupVersion = ''} = await getSiteGroup()
  let docEid = params?.docEid ? String(params.docEid) : undefined
  if (!groupEid) return {notFound: true}
  if (!docEid) return {notFound: true}
  let version = query.v ? String(query.v) : ''
  setAllowAnyHostGetCORS(context.res)
  const helpers = serverHelpers({})
  const groupId = createHmId('g', groupEid)
  const docId = createHmId('d', docEid)
  const {group} = await helpers.group.get.fetch({
    groupId,
    version: groupVersion,
  })

  await helpers.publication.get.prefetch({
    documentId: docId,
    versionId: version,
  })

  // await impatiently(
  //   helpers.publication.get.prefetch({
  //     documentId: docId,
  //     versionId: version || '',
  //   }),
  // )

  return {
    props: await getPageProps(helpers, {
      group,
    }),
  }
}
