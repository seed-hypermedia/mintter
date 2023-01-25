import {PublicationPage} from '../publication-page'
import {createChannel, createClient} from 'nice-grpc'
import {PublicationsClient, PublicationsDefinition} from '@mintter/shared'

export default function IndexPage({publication}: any) {
  console.log('🚀 ~ file: index.tsx:6 ~ IndexPage ~ publication', publication)

  return (
    <PublicationPage
      documentId="bafy2bzaceb5cnsnhyrwfx22xqixh4qmphj6k6a3gqxpfu6s7euk5bovurmrhk"
      onlyContent
    />
  )
}

export async function getServerSideProps() {
  const ch = createChannel('http://localhost:55002')
  let client: PublicationsClient = createClient(PublicationsDefinition, ch)

  let publication = await client.getPublication({
    documentId:
      'bafy2bzaceckvlm2pgjzasei2x3lort3enboc4inophpvqikoyfxdf74vusbcm',
  })
  return {
    props: {
      publication,
    },
  }
}

// mintter://bafy2bzaceb5cnsnhyrwfx22xqixh4qmphj6k6a3gqxpfu6s7euk5bovurmrhk/baeaxdiheaiqpazrdmjji6xifvr5nuky2ibn6fic3ktayrycudsasfephqprna5a
