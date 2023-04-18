import {Account, Publication, SiteInfo} from '@mintter/shared'
import {GetServerSideProps} from 'next'
import {setAllowAnyHostGetCORS} from 'server/cors'
import {accountsClient, localWebsiteClient} from '../client'
import {getSiteInfo} from '../get-site-info'
import PublicationPage from '../ssr-publication-page'

export default function PathPublicationPage({
  publication,
  author,
  siteInfo = null,
}: {
  publication?: Publication
  author?: Account | null
  siteInfo: SiteInfo | null
}) {
  return (
    <PublicationPage
      publication={publication}
      author={author}
      siteInfo={siteInfo}
    />
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const {res} = context
  const path = (context.params?.pageSlug as string) || ''
  const siteInfo = await getSiteInfo()
  let pathRecord
  try {
    pathRecord = await localWebsiteClient.getPath({path})
  } catch (e) {
    const isNotFound = !!e.rawMessage.match('Could not get record for path')
    if (isNotFound)
      return {
        notFound: true,
      }
    throw e
  }
  const publication = pathRecord.publication
  if (!publication)
    return {
      notFound: true,
    }

  setAllowAnyHostGetCORS(res)

  res.setHeader('x-mintter-document-id', publication.document.id)
  res.setHeader('x-mintter-version', publication.version)
  const definedPublisher = publication.document?.publisher
  if (definedPublisher)
    res.setHeader('x-mintter-publisher-id', definedPublisher)

  const author = null
  return {
    props: {
      publication: publication.toJson(),
      author: author ? author.toJson() : null,
      siteInfo: siteInfo ? siteInfo.toJson() : null,
    },
  }
}
