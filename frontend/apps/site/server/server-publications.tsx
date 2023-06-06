import {JsonValue} from '@bufbuild/protobuf'
import {accountsClient, publicationsClient} from 'client'
import {getSiteInfo} from 'get-site-info'
import {PublicationPageData, PublicationPageProps} from 'ssr-publication-page'

// for some reason this cannot be imported from @mintter/shared without issues:
import {Publication} from '@mintter/shared/client/.generated/documents/v1alpha/documents_pb'
import {Account, SiteInfo} from '@mintter/shared'
import {GetServerSidePropsContext} from 'next'
import {setAllowAnyHostGetCORS} from './cors'

export async function getPublicationPageProps(
  publication: Publication | null,
  documentId: string,
  version: string | null,
): Promise<PublicationPageProps> {
  const siteInfo = await getSiteInfo()
  return new Promise(async (resolve) => {
    // accounts tend to time out+fail so we have a 3 second timeout
    let loadTimeout = setTimeout(() => {
      resolve({
        publication: publication ? publication.toJson() : null,
        editors: null,
        siteInfo: siteInfo ? siteInfo.toJson() : null,
        documentId,
        version,
      })
    }, 3000)

    const editorIds = publication?.document?.editors || []

    const editors = await Promise.all(
      editorIds.map(async (editorId) => {
        try {
          return await accountsClient.getAccount({
            id: editorId,
          })
        } catch (e) {
          console.error(e)
          return editorId
          //lol accounts fail all the time
        }
      }),
    )
    clearTimeout(loadTimeout)
    resolve({
      publication: publication ? publication.toJson() : null,
      editors: editors.map((editor) => {
        if (typeof editor === 'object') return editor.toJson()
        return editor
      }),
      siteInfo: siteInfo ? siteInfo.toJson() : null,
      documentId,
      version,
    })
  })
}

// publicationsClient.getPublication but bails with null on a 3 second timeout
export async function impatientGetPublication(
  ...args: Parameters<typeof publicationsClient.getPublication>
) {
  return await new Promise<Publication | null>(async (resolve) => {
    let timeout = setTimeout(() => {
      resolve(null)
    }, 3000)

    // test only: wait 5 sec
    // await new Promise((r) => setTimeout(r, 5000))

    publicationsClient
      .getPublication(...args)
      .then((pub) => {
        clearTimeout(timeout)
        resolve(pub)
      })
      .catch((e) => {
        const {message} = e

        console.log('== ', message)
      })
  })
}

export function setResponsePublication(
  {res}: GetServerSidePropsContext,
  publication: Publication | null,
) {
  setAllowAnyHostGetCORS(res)
  if (!publication) return
  const docId = publication.document?.id
  if (!docId) throw new Error('Publication does not have document id')
  res.setHeader('x-mintter-document-id', docId)
  res.setHeader('x-mintter-version', publication.version)
}
