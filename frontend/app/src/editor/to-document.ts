import { ListStyle, Document, Block, Quote } from '@mintter/client'
import { ELEMENT_LINK } from './link-plugin'
import { ELEMENT_QUOTE } from './quote-plugin'
import type { SlateBlock, EditorTextRun, EditorQuote, EditorLink, EditorImage } from './types'
import { toInlineElement, toQuote, toTextRun, toLink } from './inline-element'

export type ToDocumentProps = {
  id: string
  title?: string
  subtitle?: string
  author: string
  blocks?: Array<SlateBlock>
  childrenListStyle: ListStyle
}

export function toDocument({
  id,
  title = '',
  subtitle = '',
  author,
  blocks,
  childrenListStyle = ListStyle.NONE,
}: ToDocumentProps): Document {
  const newDoc = Document.fromPartial({
    id,
    author,
    title,
    subtitle,
    childrenListStyle,
  })

  const blocksMap = newDoc.blocks
  const linksMap = newDoc.links
  let childrenList: Array<string> = []

  if (blocks) {
    for (const slateBlock of blocks) {
      // add block to document's childrenList
      childrenList = [...childrenList, slateBlock.id]
      // convert slate block to doc block
      const block = Block.fromPartial({
        id: slateBlock.id,
      })

      const inlineElements = slateBlock.children
        .map((leaf) => {
          if ('text' in leaf) {
            return toInlineElement({ textRun: toTextRun(leaf) })
          }
          if (leaf.type === ELEMENT_LINK) {
            // add link to linksMap
            linksMap[leaf.id] = toLink(leaf)

            return leaf.children.map((leafChild: EditorTextRun) =>
              toInlineElement({
                textRun: toTextRun({
                  ...leafChild,
                  linkKey: leaf.id,
                }),
              }),
            )
          }
          if (leaf.type === ELEMENT_QUOTE) {
            // add link to linksMap
            linksMap[leaf.id] = toLink({ id: leaf.id, url: leaf.url })

            return toInlineElement({ quote: toQuote(leaf) })
          }

          throw Error(`toDocument Error: Block -> inlineElement not supported`)
        })
        .flat()

      block.elements = inlineElements
      blocksMap[slateBlock.id] = block
    }
  }

  newDoc.children = childrenList

  return newDoc
}
