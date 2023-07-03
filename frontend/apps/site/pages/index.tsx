import {GetPathResponse} from '@mintter/shared'
import {GetServerSideProps} from 'next'
import PublicationPage from '../publication-page'
import {useRouteQuery} from 'server/router-queries'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'
import {localWebsiteClient} from 'client'
import {setResponsePublication} from 'server/server-publications'

// Temp Mintter home screen document:
let fallbackDocId = process.env.MINTTER_HOME_PUBID || 'mnoboS11GwRlRAh2dhYlTw'
let fallbackVersion =
  process.env.MINTTER_HOME_VERSION ||
  'bafy2bzacednwllikmc7rittnmz4s7cfpo3p2ldsap3bcmgxp7cdpzhoiu5w'

//https://mintter.com/p/mnoboS11GwRlRAh2dhYlTw?v=bafy2bzacednwllikmc7rittnmz4s7cfpo3p2ldsap3bcmgxp7cdpzhoiu5w

export default function HomePage(props: {
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
  const helpers = serverHelpers({})

  let docId: undefined | string = undefined
  let version: undefined | string = undefined
  let pathRecord: GetPathResponse | null = null
  if (process.env.GW_NEXT_HOST) {
    pathRecord = await localWebsiteClient.getPath({path: '/'})
    docId = pathRecord?.publication?.document?.id
    const queryVersion = context.query.v ? String(context.query.v) : undefined
    version = queryVersion || pathRecord?.publication?.version || undefined
  } else {
    docId = fallbackDocId
    version = fallbackVersion
  }
  if (!docId) {
    return {
      notFound: true,
    }
  }
  await helpers.publication.get.prefetch({
    documentId: docId,
    versionId: version,
  })

  setResponsePublication(context, docId, version)

  return {
    props: await getPageProps(helpers, {
      documentId: docId,
      version: version,
      metadata: false,
    }),
  }
}
