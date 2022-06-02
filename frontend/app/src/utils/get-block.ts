import { getPublication, LinkNode, Publication } from '@app/client'
import { blockNodeToSlate } from '@app/client/v2/block-to-slate'
import { FlowContent } from '@mintter/mttast'
import { visit } from 'unist-util-visit'

export type GetBlockResult = {
  publication: Publication
  block: FlowContent
}

export async function getBlock(entry?: LinkNode): Promise<GetBlockResult | undefined> {
  if (!entry) return
  let publication = await getPublication(entry.documentId)

  let block: FlowContent

  if (publication.document) {
    let content = blockNodeToSlate(publication.document.children)
    if (content) {
      visit(
        content,
        { id: entry.blockId },
        (node) => {
          block = node
        },
      )
    }

    return {
      publication: {
        ...publication,
        document: {
          ...publication.document,
          content: [content]
        }
      },
      //@ts-ignore
      block,
    }
  }
}
