import {
  GetServerSideProps,
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next'
import PublicationPage from '../../publication-page'
import {impatiently} from 'server/impatiently'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'
import {useRequiredRouteQuery, useRouteQuery} from 'server/router-queries'
import {setResponsePublication} from 'server/server-publications'

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
  if (!docId) return {notFound: true}

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
    }
  }
  await impatiently(
    helpers.publication.get.prefetch({
      documentId: docId,
      versionId: version || '',
    }),
  )

  setResponsePublication(context, docId, version)

  return {
    props: await getPageProps(helpers, {}),
  }
}
