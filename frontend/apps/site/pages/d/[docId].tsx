import {
  GetServerSideProps,
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next'
import {setAllowAnyHostGetCORS} from 'server/cors'
import {impatiently} from 'server/impatiently'
import {useRequiredRouteQuery, useRouteQuery} from 'server/router-queries'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'
import PublicationPage from 'publication-page'

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
      documentId={useRequiredRouteQuery('docId')}
      version={useRouteQuery('v')}
    />
  )
}

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const {params, query} = context
  let docId = params?.docId ? String(params.docId) : undefined
  let version = query.v ? String(query.v) : null

  setAllowAnyHostGetCORS(context.res)

  if (!docId) return {notFound: true} as const

  const helpers = serverHelpers({})

  const docRecord = await helpers.publication.getDocRecord.fetch({
    documentId: docId,
  })
  if (docRecord) {
    return {
      redirect: {
        temporary: true,
        destination: getDocSlugUrl(
          docRecord.path,
          docId,
          version || docRecord.versionId,
        ),
      },
      props: {},
    } as const
  }
  await impatiently(
    helpers.publication.get.prefetch({
      documentId: docId,
      versionId: version || '',
    }),
  )

  return {
    props: await getPageProps(helpers, {}),
  }
}
