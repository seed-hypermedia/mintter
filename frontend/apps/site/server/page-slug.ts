import {GetServerSidePropsContext} from 'next'
import {setAllowAnyHostGetCORS} from './cors'
import {getPageProps, serverHelpers} from './ssr-helpers'

export async function prepareSlugPage(
  context: GetServerSidePropsContext,
  pathName: string,
) {
  const helpers = serverHelpers({})

  setAllowAnyHostGetCORS(context.res)

  const path = await helpers.publication.getPath.fetch({pathName})

  if (!path) return {notFound: true} as const
  await helpers.publication.get.prefetch({
    documentId: path.documentId,
    versionId: path.versionId,
  })
  return {
    props: await getPageProps(helpers, {pathName}),
  }
}
