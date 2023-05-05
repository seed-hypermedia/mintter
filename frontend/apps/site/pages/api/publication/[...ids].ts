import {Account, Publication} from '@mintter/shared'
import type {NextRequest} from 'next/server'
import {accountsClient, publicationsClient} from '../../../client'

export default async function handler(req: NextRequest) {
  const {searchParams} = new URL(req.nextUrl)
  let publication: Publication | null = null
  let author: Account | null = null
  let editors: Array<Account> = []
  const [documentId, version] = searchParams.getAll('id')

  try {
    publication = await publicationsClient.getPublication({
      documentId,
      version,
    })
    if (!publication) {
      return new Response(
        JSON.stringify({
          notFound: true,
        }),
      )
    }

    author = publication.document?.author
      ? await accountsClient.getAccount({id: publication.document?.author})
      : null

    editors = publication.document?.editors.length
      ? await Promise.all(
          publication.document?.editors.map((e) =>
            accountsClient.getAccount({id: e}),
          ),
        )
      : []

    return new Response(
      JSON.stringify({
        publication: publication ? publication.toJson() : null,
        author: author ? author.toJson() : null,
        editors: editors ? editors.map((e) => e.toJson()) : [],
      }),
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        publication: publication ? publication.toJson() : null,
        author: author ? author.toJson() : null,
        editors: editors ? editors.map((e) => e.toJson()) : [],
      }),
    )
  }
}
