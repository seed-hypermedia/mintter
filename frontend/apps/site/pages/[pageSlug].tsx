import {GetPathResponse, Publication} from '@mintter/shared'
import {GetServerSideProps} from 'next'
import {localWebsiteClient} from '../client'
import PublicationPage, {PublicationPageProps} from '../ssr-publication-page'
import {
  getPublicationPageProps,
  impatientGetPublication,
  setResponsePublication,
} from 'server/server-publications'

export default function PathPublicationPage(props: PublicationPageProps) {
  return <PublicationPage {...props} />
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const path = (context.params?.pageSlug as string) || ''
  const version = context.query.v ? String(context.query.v) : undefined
  let publication: Publication | null = null
  let pathRecord: GetPathResponse | null
  try {
    pathRecord = await localWebsiteClient.getPath({path}).catch((e) => {
      if (e.message.match('Could not get local document although was found'))
        return null
      else throw e
    })
    if (!pathRecord) {
      return {
        notFound: true,
      }
    }
    publication = pathRecord.publication || null
    const docId = pathRecord.publication?.document?.id
    if (!docId) throw new Error('No document on this pathRecord?!')
    if (version && version !== pathRecord.publication?.version) {
      const requestedVersionPub = await impatientGetPublication({
        documentId: docId,
        version,
      })

      if (!requestedVersionPub)
        return {
          notFound: true,
        }
      publication = requestedVersionPub
    }

    setResponsePublication(context, publication)
    return {
      props: await getPublicationPageProps(
        publication,
        docId,
        publication?.version || null,
      ),
    }
  } catch (error) {
    const isNotFound = !!error.rawMessage?.match(
      'Could not get record for path',
    )
    if (isNotFound)
      return {
        notFound: true,
      }
    throw error
  }
}
