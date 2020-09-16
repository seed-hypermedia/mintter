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
  GetDocumentResponse,
} from '@mintter/proto/v2/documents_pb'
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
  destinationPath?: number[] // destination path in which will be transclude to (draft destination path)
}

export function useTransclusion({editor}) {
  const createTransclusion = useCallback(
    async ({
      source,
      destination,
      destinationPath,
      block,
    }: CreateTransclusionRequest) => {
      let draft: GetDocumentResponse | Document
      let transclusionId: string = `${source}/${block.id}`
      console.log('useTransclusion -> transclusionId', transclusionId)
      if (destination) {
        draft = await getDocument('key', destination)
        console.log('useTransclusion -> draft', draft)

        // Create block reference for the block being transcluded:
        let transclusionRef = new BlockRef()
        transclusionRef.setRef(transclusionId)
        console.log('useTransclusion -> transclusionRef', transclusionRef)

        let document = draft.getDocument()
        document.getBlockRefList().addRefs(transclusionRef)

        // const req = new UpdateDraftRequest()
        // req.setDocument(document)

        // await updateDraftWithRequest(req)
        console.log("Update Draft Here!, waiting for Burdi's update")
      } else {
        // no destination provided, create a new Draft
        draft = await createDraft()

        // main blockRefList
        let blockRefList = new BlockRefList()
        blockRefList.setStyle(BlockRefList.Style.NONE)

        // transclusion blockRef
        let transclusionRef = new BlockRef()
        transclusionRef.setRef(transclusionId)

        // empty blockRef
        let emptyBlockRef = new BlockRef()
        emptyBlockRef.setRef(uuid())

        // add refs to blockRefList
        blockRefList.addRefs(transclusionRef, 0)
        blockRefList.addRefs(emptyBlockRef, 1)

        // set blockRef to document
        draft.setBlockRefList(blockRefList)

        // update new draft
        const req = new UpdateDraftRequest()

        req.setDocument(draft)
        console.log(JSON.stringify(req.toObject(), null, 4))

        // await updateDraftWithRequest(req)

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
  let blockRef: any = {
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
