import {accountsClient, localWebsiteClient} from '../client'
import {Account, Publication} from '@mintter/shared'
import {GetServerSideProps} from 'next'
import PublicationPage from '../ssr-publication-page'

export default function PathPublicationPage({
  publication,
  author,
}: {
  publication?: Publication
  author?: Account | null
}) {
  return <PublicationPage publication={publication} author={author} />
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
    },
  }
}
