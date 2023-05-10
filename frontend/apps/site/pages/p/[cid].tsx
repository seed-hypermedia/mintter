import {Publication} from '@mintter/shared'
import {GetServerSidePropsContext} from 'next'
import {publicationsClient} from '../../client'
import PublicationPage, {PublicationPageProps} from '../../ssr-publication-page'
import {
  getPublicationPageProps,
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
    publication = await publicationsClient.getPublication({
      documentId: cid,
      version,
    })
    if (!publication) {
      return {
        notFound: true,
      }
    }
    setResponsePublication(context, publication)
    return {
      props: await getPublicationPageProps(publication),
    }
  } catch (error) {
    // const isNotFound = !!error.rawMessage?.match(
    //   'Could not get record for path',
    // )
    // if (isNotFound)
    //   return {
    //     notFound: true,
    //   }
    throw error
  }
}
