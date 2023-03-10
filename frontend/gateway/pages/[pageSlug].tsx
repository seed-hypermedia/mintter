import {Account, Publication} from '@mintter/shared'
import {GetServerSideProps} from 'next'
import {accountsClient, localWebsiteClient} from '../client'
import {getSiteTitle} from '../get-site-info'
import PublicationPage from '../ssr-publication-page'

export default function PathPublicationPage({
  publication,
  author,
  siteTitle = null,
}: {
  publication?: Publication
  author?: Account | null
  siteTitle: string | null
}) {
  return (
    <PublicationPage
      publication={publication}
      author={author}
      siteTitle={siteTitle}
    />
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const path = (context.params?.pageSlug as string) || ''

  const pathRecord = await localWebsiteClient.getPath({path})
  const publication = pathRecord.publication
  if (!publication)
    return {
      notFound: true,
    }
  const author = publication.document?.author
    ? await accountsClient.getAccount({id: publication.document?.author})
    : null
  return {
    props: {
      publication: publication.toJson(),
      author: author ? author.toJson() : null,
      siteTitle: await getSiteTitle(),
    },
  }
}
