import {GetPathResponse, Publication} from '@mintter/shared'
import {GetServerSideProps} from 'next'
import {localWebsiteClient} from '../client'
import PublicationPage from '../publication-page'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'
import {useRouteQuery} from 'server/router-queries'
import {impatiently} from 'server/impatiently'

export default function PathPublicationPage(props: {
  documentId: string
  version?: string
}) {
  return (
    <PublicationPage
      documentId={props.documentId}
      version={useRouteQuery('v') || props.version}
    />
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const path = (context.params?.pageSlug as string) || ''
  const version = context.query.v ? String(context.query.v) : undefined
  let pathRecord: GetPathResponse | null = null
  try {
    pathRecord = await localWebsiteClient.getPath({path})
  } catch (error) {
    const isNotFound = !!error.rawMessage?.match(
      'Could not get record for path',
    )
    if (!isNotFound) throw error
  }
  if (!pathRecord) {
    return {
      notFound: true,
    }
  }
  const docId = pathRecord.publication?.document?.id
  if (!docId) throw new Error('No publication.document.id on the pathRecord')
  const requestedVersion =
    version || pathRecord.publication?.version || undefined

  const helpers = serverHelpers({})

  await impatiently(
    helpers.publication.get.prefetch({
      documentId: docId,
      versionId: requestedVersion,
    }),
  )

  return {
    props: await getPageProps(helpers, {
      documentId: docId,
      version: requestedVersion,
    }),
  }
}
