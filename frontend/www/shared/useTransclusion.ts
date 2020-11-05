import {useCallback} from 'react'
import {makeProto, SlateBlock} from '@mintter/editor'
import {
  Block,
  Image,
  InlineElement,
  Document,
  Paragraph,
  UpdateDraftRequest,
  BlockRefList,
  BlockRef,
  GetDocumentResponse,
} from '@mintter/api/v2/documents_pb'
import {
  createDraft,
  getDocument,
  updateDraftWithRequest,
} from 'shared/mintterClient'
import {v4 as uuid} from 'uuid'

export interface CreateTransclusionRequest {
  source: string // source publication version
  destination?: string // destination draft version (undefined if needs to create a new one)
  block: SlateBlock // publication block that will be transclude
}

export function useTransclusion() {
  const createTransclusion = useCallback(
    async ({source, destination, block}: CreateTransclusionRequest) => {
      let draft: GetDocumentResponse | Document
      let transclusionId: string
      if (block.id.includes('/')) {
        // is a transclusion, do not create a new id
        transclusionId = block.id
      } else {
        transclusionId = `${source}/${block.id}`
      }

      if (destination) {
        draft = await getDocument('key', destination)

        // Create block reference for the block being transcluded:
        const transclusionRef = new BlockRef()
        transclusionRef.setRef(transclusionId)

        const document = draft.getDocument()
        document.getBlockRefList().addRefs(transclusionRef)

        const req = new UpdateDraftRequest()
        req.setDocument(document)

        await updateDraftWithRequest(req)

        return destination
      } else {
        // no destination provided, create a new Draft
        draft = await createDraft()

        // main blockRefList
        const blockRefList = new BlockRefList()
        blockRefList.setStyle(BlockRefList.Style.NONE)

        // transclusion blockRef
        const transclusionRef = new BlockRef()
        transclusionRef.setRef(transclusionId)

        // empty blockRef
        const emptyBlockRef = new BlockRef()
        const emptyBlockId = uuid()
        emptyBlockRef.setRef(emptyBlockId)

        // add refs to blockRefList
        blockRefList.addRefs(transclusionRef, 0)
        blockRefList.addRefs(emptyBlockRef, 1)

        // set blockRef to document
        draft.setBlockRefList(blockRefList)

        // update new draft
        const req = new UpdateDraftRequest()
        const map: Map<string, Block> = req.getBlocksMap()

        map.set(
          emptyBlockId,
          createBlock({
            id: emptyBlockId,
            paragraph: {
              inlineElementsList: [
                {
                  text: '',
                },
              ],
            },
            quotersList: [],
          }),
        )

        req.setDocument(draft)

        await updateDraftWithRequest(req)

        return draft.getVersion()
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

function createImage(image: Image.AsObject) {
  return image
}

function createInlineElement(inlineElement) {
  return makeProto(new InlineElement(), inlineElement)
}

function createBlockRefList(blockRefList: BlockRefList.AsObject) {
  return makeProto(new BlockRefList(), {
    style: blockRefList.style,
    refs: blockRefList.refsList.map(createBlockRef),
  })
}

function createBlockRef(sourceRef: BlockRef.AsObject) {
  const blockRef: any = {
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
//   pathname: `/private/editor/${newDraft.version}`,
// })
