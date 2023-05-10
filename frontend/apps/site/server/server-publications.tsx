import {JsonValue} from '@bufbuild/protobuf'
import {accountsClient} from 'client'
import {getSiteInfo} from 'get-site-info'
import {PublicationPageData, PublicationPageProps} from 'ssr-publication-page'

// for some reason this cannot be imported from @mintter/shared without issues:
import {Publication} from '@mintter/shared/client/.generated/documents/v1alpha/documents_pb'
import {Account, SiteInfo} from '@mintter/shared'
import {GetServerSidePropsContext} from 'next'
import {setAllowAnyHostGetCORS} from './cors'

export async function getPublicationPageProps(
  publication: Publication,
): Promise<PublicationPageProps> {
  const siteInfo = await getSiteInfo()

  const editorIds = publication.document?.editors || []

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
  return {
    publication: publication.toJson(),
    editors: editors.map((editor) => {
      if (typeof editor === 'object') return editor.toJson()
      return editor
    }),
    siteInfo: siteInfo ? siteInfo.toJson() : null,
  }
}

export function setResponsePublication(
  {res}: GetServerSidePropsContext,
  publication: Publication,
) {
  setAllowAnyHostGetCORS(res)
  const docId = publication.document?.id
  if (!docId) throw new Error('Publication does not have document id')
  res.setHeader('x-mintter-document-id', docId)
  res.setHeader('x-mintter-version', publication.version)
}
