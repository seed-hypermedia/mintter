import {
  GetServerSideProps,
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next'
import PublicationPage from 'publication-page'
import {setAllowAnyHostGetCORS} from 'server/cors'
import {useRequiredRouteQuery, useRouteQuery} from 'server/router-queries'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'
import {createHmId} from '@mintter/shared'

function getDocSlugUrl(
  pathName: string | undefined,
  docId: string,
  versionId?: string,
  blockRef?: string,
) {
  let url = `/d/${docId}`
  if (pathName) url = pathName === '/' ? '/' : `/${pathName}`
  if (versionId) url += `?v=${versionId}`
  if (blockRef) url += `#${blockRef}`
  return url
}

export default function IDPublicationPage(
  props: InferGetServerSidePropsType<typeof getServerSideProps>,
) {
  return (
    <PublicationPage
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
  let version = query.v ? String(query.v) : null
  setAllowAnyHostGetCORS(context.res)

  if (!docEid) return {notFound: true} as const

  const docId = createHmId('d', docEid)

  const helpers = serverHelpers({})

  // if (docRecord) {
  // // old redirect to pretty URL behavior
  //   return {
  //     redirect: {
  //       temporary: true,
  //       destination: getDocSlugUrl(
  //         docRecord.path,
  //         docId,
  //         version || docRecord.versionId,
  //       ),
  //     },
  //     props: {},
  //   } as const
  // }

  // await impatiently(
  //   helpers.publication.get.prefetch({
  //     documentId: docId,
  //     versionId: version || '',
  //   }),
  // )

  return {
    props: await getPageProps(helpers, {}),
  }
}
