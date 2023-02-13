import {getPublication, Publication} from '@mintter/shared'
import {GetServerSideProps} from 'next'
import PublicationPage from '../../ssr-publication-page'

export default function CIDPublicationPage({
  publication,
}: {
  publication?: Publication
}) {
  return <PublicationPage publication={publication} />
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const [documentId, version] = context.params?.ids || []
  const publication = await getPublication(documentId, version)
  return {
    props: {
      publication: publication.toJson(),
    },
  }
}
