export type WebCapture = {
  uploadedPNG: string
  uploadedPDF: string
  uploadedHTML: string
  htmlValue: string
}

export async function importWebCapture(input: WebCapture) {
  console.log('TODO: IMPLEMENT ME')
  // TODO: IMPLEMENT ME
  // const parser = new DOMParser()
  // const dom = parser.parseFromString(input.htmlValue, 'text/html')
  // const bodyEl = dom.getElementsByTagName('body').item(0)
  // // const mainEl = dom.getElementsByTagName('main').item(0)
  // // const articleEl = dom.getElementsByTagName('main').item(0)
  // // const mainContentEl = mainEl || articleEl || bodyEl
  // if (!bodyEl)
  //   throw new Error('Could not extract the body element for this web page')
  // const draft = await client.drafts.createDraft({})
  // function produceBodyOperations(
  //   parentId: string,
  //   blockNodes: BlockNode[],
  // ): DocumentChange[] {
  //   const childrenOps: DocumentChange[] = []
  //   const blockOps = blockNodes
  //     .map((blockNode, nodeIndex) => {
  //       if (!blockNode.block) return []
  //       const leftSibling =
  //         nodeIndex === 0 ? '' : blockNodes[nodeIndex - 1].block?.id
  //       childrenOps.push(
  //         ...produceBodyOperations(blockNode.block.id, blockNode.children),
  //       )
  //       return [
  //         new DocumentChange({
  //           op: {
  //             case: 'moveBlock',
  //             value: {
  //               blockId: blockNode.block.id,
  //               leftSibling,
  //               parent: parentId,
  //             },
  //           },
  //         }),
  //         new DocumentChange({
  //           op: {case: 'replaceBlock', value: blockNode.block},
  //         }),
  //       ]
  //     })
  //     .flat()
  //   return [...blockOps, ...childrenOps]
  // }
  // function createBlockID(): string {
  //   return String(Math.round(Math.random() * 100_000))
  // }
  // function extractBlockNodes(htmlNodes: NodeListOf<ChildNode>): BlockNode[] {
  //   const blockNodes: BlockNode[] = []
  //   return Array.from(htmlNodes)
  //     .map((htmlNode) => {
  //       const {nodeName, textContent} = htmlNode
  //       if (
  //         nodeName === 'ARTICLE' ||
  //         nodeName === 'DIV' ||
  //         nodeName === 'MAIN' ||
  //         nodeName === 'ARTICLE'
  //       ) {
  //         // here we attempt to recurse into the document content. we are avoiding elements such as NAV
  //         return extractBlockNodes(htmlNode.childNodes)
  //       } else if (
  //         nodeName === '#text' &&
  //         textContent &&
  //         !textContent?.match(/^\s*$/)
  //       ) {
  //         // handles stray text in the document
  //         return [
  //           new BlockNode({
  //             block: {
  //               id: createBlockID(),
  //               type: 'paragraph',
  //               text: textContent,
  //             },
  //           }),
  //         ]
  //       } else if (
  //         (nodeName === 'P' || nodeName === 'LI') &&
  //         textContent &&
  //         !textContent?.match(/^\s*$/)
  //       ) {
  //         return [
  //           new BlockNode({
  //             block: {
  //               id: createBlockID(),
  //               type: 'paragraph',
  //               text: textContent,
  //             },
  //           }),
  //         ]
  //       } else if (
  //         (nodeName === 'H1' ||
  //           nodeName === 'H2' ||
  //           nodeName === 'H3' ||
  //           nodeName === 'H4' ||
  //           nodeName === 'H5' ||
  //           nodeName === 'H6' ||
  //           nodeName === 'H7') &&
  //         textContent &&
  //         !textContent?.match(/^\s*$/)
  //       ) {
  //         // explicit paragraphs
  //         return [
  //           new BlockNode({
  //             block: {
  //               id: createBlockID(),
  //               type: 'heading',
  //               text: textContent,
  //             },
  //           }),
  //         ]
  //       } else if (nodeName === 'UL') {
  //         return [
  //           new BlockNode({
  //             block: {
  //               id: createBlockID(),
  //               type: 'paragraph',
  //               attributes: {
  //                 childrenType: 'ul',
  //               },
  //               text: '',
  //             },
  //             children: extractBlockNodes(htmlNode.childNodes),
  //           }),
  //         ]
  //       } else {
  //         // console.log(
  //         //   'unhandled children in produceOperations',
  //         //   htmlNode.nodeName,
  //         //   htmlNode,
  //         // )
  //         return []
  //       }
  //     })
  //     .flat()
  // }
  // const pageTitle = dom.head.getElementsByTagName('title').item(0)?.textContent
  // const blockNodes = extractBlockNodes(bodyEl.childNodes)
  // const docChanges = produceBodyOperations('', blockNodes)
  // if (pageTitle) {
  //   docChanges.push(
  //     new DocumentChange({
  //       op: {case: 'setTitle', value: pageTitle},
  //     }),
  //   )
  // }
  // const draftChangeId = await client.drafts.updateDraft({
  //   documentId: draft.id,
  //   changes: docChanges,
  // })
  // const published = await client.drafts.publishDraft({documentId: draft.id})
  // return {
  //   published,
  // }
}
