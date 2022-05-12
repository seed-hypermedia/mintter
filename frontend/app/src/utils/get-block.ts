import {getPublication, LinkNode, Publication} from '@app/client'
import {FlowContent} from '@mintter/mttast'
import {visit} from 'unist-util-visit'

export type GetBlockResult =
  | {
      publication: Publication
      block: FlowContent
    }
  | undefined

export async function getBlock(entry?: LinkNode): Promise<GetBlockResult> {
  if (!entry) return
  let publication = await getPublication(entry.documentId)

  let block: FlowContent

  if (publication.document?.content) {
    visit(
      JSON.parse(publication.document.content)[0],
      {id: entry.blockId},
      (node) => {
        block = node
      },
    )
  }

  //@ts-ignore
  return {
    publication,
    //@ts-ignore
    block,
  }
}
