import {Publication} from '@mintter/shared'
import {GetServerSideProps} from 'next'
import {localWebsiteClient} from '../client'
import PublicationPage, {PublicationPageProps} from '../ssr-publication-page'
import {
  getPublicationPageProps,
  setResponsePublication,
} from 'server/server-publications'

export default function PathPublicationPage(props: PublicationPageProps) {
  return <PublicationPage {...props} />
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const path = (context.params?.pageSlug as string) || ''
  let publication: Publication | null = null
  let pathRecord
  try {
    pathRecord = await localWebsiteClient.getPath({path})
    publication = pathRecord.publication
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
