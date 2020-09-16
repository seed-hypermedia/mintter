import {useCallback} from 'react'
import {makeProto, SlateBlock, toBlock} from '@mintter/editor'
import {
  Block,
  Image,
  InlineElement,
  Document,
  Paragraph,
  UpdateDraftRequest,
  BlockRefList,
  BlockRef,
} from '@mintter/proto/v2/documents_pb'
import {
  createDraft,
  getDocument,
  updateDraftWithRequest,
} from 'shared/mintterClient'

export interface CreateTransclusionRequest {
  source: string // source publication version
  destination?: string // destination draft version (undefined if needs to create a new one)
  block: SlateBlock // publication block that will be transclude
  destinationPath?: number[] // destination path in which will be transclude to (draft destination path)
}

export function useTransclusion({editor}) {
  const createTransclusion = useCallback(
    async ({
      source,
      destination,
      destinationPath,
      block,
    }: CreateTransclusionRequest): Promise<string> => {
      let draft: Document
      let transclusionId: string = `${destination}/${block.id}`
      if (destination) {
        draft = await getDocument('key', destination)
        const {document, blocksMap: originalBlocksMap} = draft.toObject()

        const req = new UpdateDraftRequest()
        const map: Map<string, Block> = req.getBlocksMap()

        for (let [nodeId, node] of originalBlocksMap) {
          console.log({node})
          let block: Block = createBlock(node)
          map.set(nodeId, block)
        }

        addTransclusionToMap(block, transclusionId, map)
        const blockRefList = updateBlockRefList(document, transclusionId)
        console.log('useTransclusion -> blockRefList', blockRefList)

        const {id, version, title, subtitle, author} = document
        const docWithTransclusion = makeProto(new Document(), {
          id,
          version,
          title,
          subtitle,
          author,
          blockRefList,
        })

        req.setDocument(docWithTransclusion)
        console.log({docWithTransclusion: docWithTransclusion.toObject()})
        await updateDraftWithRequest(req)
        console.log('Draft Updated!!')

        // TODO: creating 2 transclusions without blockId
        // TODO: rendering transclusion without content
      } else {
        // no destination provided, create a new Draft
        draft = await createDraft()
        console.log('create a new draft with transclusion')
      }
    },
    [],
  )

  return {
    createTransclusion,
  }
}

function createBlock(node: Block.AsObject): Block {
  return makeProto(new Block(), {
    id: node.id,
    paragraph: createParagraph(node.paragraph),
    image: createImage(node.image),
  })
}

function createParagraph(paragraph: Paragraph.AsObject): Paragraph {
  if (paragraph) {
    return makeProto(new Paragraph(), {
      inlineElements: paragraph.inlineElementsList.map(createInlineElement),
    })
  }

  return
}

function createImage(image: Image.AsObject): Image {
  return
}

function createInlineElement(inlineElement) {
  return makeProto(new InlineElement(), inlineElement)
}

function addTransclusionToMap(
  blockSource: SlateBlock,
  transclusionId: string,
  map: Map<string, Block>,
) {
  const transclusion = createBlock({
    ...blockSource,
    id: transclusionId,
  })
  map.set(transclusionId, transclusion)
  console.log('transclusion', transclusion.toObject())
  console.log({map})
}

function updateBlockRefList(
  document: Document.AsObject,
  transclusionId,
): BlockRefList {
  return createBlockRefList({
    style: document.blockRefList.style,
    refsList: [
      ...document.blockRefList.refsList,
      {
        ref: transclusionId,
        blockRefList: undefined, // possible blockRefList
      },
    ],
  })
}

function createBlockRefList(blockRefList: BlockRefList.AsObject) {
  return makeProto(new BlockRefList(), {
    style: blockRefList.style,
    refs: blockRefList.refsList.map(createBlockRef),
  })
}

function createBlockRef(sourceRef: BlockRef.AsObject) {
  let blockRef = {
    ref: sourceRef.ref,
  }

  if (sourceRef.blockRefList) {
    blockRef.blockRefList = createBlockRefList(sourceRef.blockRefList)
  }

  return makeProto(new BlockRef(), blockRef)
}

// const n = await createDraft()
// const newDraft = n.toObject()
// const transclusionId = `${version}/${block.id}`
// const req = new UpdateDraftRequest()
// const map: Map<string, Block> = req.getBlocksMap()
// const emptyBlockId = uuid()
// const emptyBlock = {
//   type: ELEMENT_BLOCK,
//   id: emptyBlockId,
//   children: [
//     {
//       type: ELEMENT_PARAGRAPH,
//       children: [
//         {
//           text: '',
//         },
//       ],
//     },
//   ],
// }
// map.set(emptyBlockId, toBlock(emptyBlock))
// const update = toDocument({
//   document: {
//     id: newDraft.id,
//     author: newDraft.author,
//     version: newDraft.version,
//   },
//   state: {
//     title: '',
//     subtitle: '',
//     blocks: [
//       {
//         type: ELEMENT_BLOCK_LIST,
//         id: uuid(),
//         listType: BlockRefList.Style.NONE,
//         children: [
//           {
//             type: ELEMENT_TRANSCLUSION,
//             id: transclusionId,
//             children: block.children,
//           },
//           {
//             ...emptyBlock,
//           },
//         ],
//       },
//     ],
//   },
// })
// req.setDocument(update)
// await updateDraftWithRequest(req)
// push({
//   pathname: `/editor/${newDraft.version}`,
// })
