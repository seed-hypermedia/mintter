import {Account, Publication, SiteInfo} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {GetServerSideProps} from 'next'
import {setAllowAnyHostGetCORS} from 'server/cors'
import {accountsClient, localWebsiteClient, publicationsClient} from '../client'
import {GatewayHead} from '../gateway-head'
import {getSiteInfo} from '../get-site-info'
import {PublicationPlaceholder} from '../publication-placeholder'
import {SiteHead} from '../site-head'
import PublicationPage, {PublicationPageProps} from '../ssr-publication-page'
import {JsonValue} from '@bufbuild/protobuf'
import {
  getPublicationPageProps,
  impatientGetPublication,
  setResponsePublication,
} from 'server/server-publications'

let pubId =
  process.env.MINTTER_HOME_PUBID ||
  'bafy2bzaceajij5bzr4yakyaxmjgffu7jq4y3sdie2tozl65igufxgrcu464gi'
let version =
  process.env.MINTTER_HOME_VERSION ||
  'baeaxdiheaiqizbsrt7joblgzp2nj6r7kptdzyv2nvsuzstxlhs5ujrhk7a4n6pi'

//https://mintter.com/p/bafy2bzaceajij5bzr4yakyaxmjgffu7jq4y3sdie2tozl65igufxgrcu464gi?v=baeaxdiheaiqizbsrt7joblgzp2nj6r7kptdzyv2nvsuzstxlhs5ujrhk7a4n6pi

export default function HomePage(props: PublicationPageProps) {
  return <PublicationPage {...props} />
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  let publication: Publication | null = null
  try {
    if (!process.env.GW_NEXT_HOST) {
      // Temp Mintter home screen document:
      publication = await impatientGetPublication({
        documentId: pubId,
        version,
      })
    }
    if (!publication) {
      try {
        const pathRecord = await localWebsiteClient.getPath({path: '/'})
        publication = pathRecord.publication || null
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
    if (!publication) {
      return {
        notFound: true,
      }
    }
    const documentId = publication.document?.id
    if (!documentId) throw new Error('Publication has no document ID?!')
    const pubVersion = publication.version
    setResponsePublication(context, publication)
    return {
      props: {
        ...(await getPublicationPageProps(publication, documentId, pubVersion)),
        metadata: false,
      },
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
