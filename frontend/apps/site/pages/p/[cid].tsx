import {Publication} from '@mintter/shared'
import {GetServerSidePropsContext} from 'next'
import {localWebsiteClient, publicationsClient} from '../../client'
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
    const allWebPubs = await localWebsiteClient.listWebPublications({})
    const webPub = allWebPubs.publications.find((pub) => pub.documentId === cid)
    if (webPub) {
      const destPath = webPub.path === '/' ? '/' : `/${webPub.path}`
      return {
        redirect: {
          destination: `${destPath}?v=${version || webPub.version}`,
          permanent: false,
        },
      }
    }

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
