import {Publication} from '@mintter/shared'
import {GetServerSidePropsContext} from 'next'
import {publicationsClient} from '../../client'
import PublicationPage, {PublicationPageProps} from '../../ssr-publication-page'
import {
  getPublicationPageProps,
  impatientGetPublication,
  setResponsePublication,
} from 'server/server-publications'

export default function IDPublicationPage(props: PublicationPageProps) {
  return <PublicationPage {...props} />
}

export const getServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const {params, query} = context
  let cid = params?.cid ? String(params.cid) : undefined
  let version = query.v ? String(query.v) : undefined
  let publication: Publication | null = null
  if (!cid) return {notFound: true}
  try {
    publication = await impatientGetPublication({
      documentId: cid,
      version,
    })
    setResponsePublication(context, publication)
    return {
      props: await getPublicationPageProps(publication, cid, version || null),
    }
  } catch (error) {
    const isNotFound = !!error.rawMessage?.match('[not_found]')
    if (isNotFound)
      return {
        notFound: true,
      }
    throw error
  }
}
