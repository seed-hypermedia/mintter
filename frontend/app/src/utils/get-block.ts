import {
  getPublication,
  LinkNode,
  Publication,
  blockNodeToSlate,
} from '@mintter/client'
import {FlowContent} from '@mintter/mttast'
import {visit} from 'unist-util-visit'

export type GetBlockResult = {
  publication: Publication
  block: FlowContent
}

export async function getBlock(
  entry?: LinkNode,
): Promise<GetBlockResult | undefined> {
  if (!entry) return
  let publication = await getPublication(entry.documentId)

  let block: FlowContent

  if (publication.document) {
    // TODO: use the parent list type instead
    let content = blockNodeToSlate(publication.document.children, 'group')
    if (content) {
      visit(content, {id: entry.blockId}, (node) => {
        block = node
      })
    }

    return {
      publication: {
        ...publication,
        document: {
          ...publication.document,
          content: [content],
        },
      },
      //@ts-ignore
      block,
    }
  }
}
