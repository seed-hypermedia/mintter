import {publicationsClient} from 'client'

// for some reason this cannot be imported from @mintter/shared without issues:
import {Publication} from '@mintter/shared/client/.generated/documents/v1alpha/documents_pb'
import {GetServerSidePropsContext} from 'next'
import {setAllowAnyHostGetCORS} from './cors'

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
  docId: string,
  version?: string | null,
) {
  setAllowAnyHostGetCORS(res)
  if (!docId) throw new Error('Publication does not have document id')
  res.setHeader('x-mintter-document-id', docId)
  if (version) {
    res.setHeader('x-mintter-version', version)
  }
}
