import {getLocalWebSiteClient} from '@mintter/shared'
import {transport} from '../client'
import {Publication} from '@mintter/shared'
import {GetServerSideProps} from 'next'
import PublicationPage from '../ssr-publication-page'

export default function PathPublicationPage({
  publication,
}: {
  publication?: Publication
}) {
  return <PublicationPage publication={publication} />
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const path = (context.params?.pageSlug as string) || ''
  const site = getLocalWebSiteClient(transport)
  const pathRecord = await site.getPath({path})
  const publication = pathRecord.publication
  if (!publication)
    return {
      notFound: true,
    }
  return {
    props: {
      publication: publication.toJson(),
    },
  }
}
