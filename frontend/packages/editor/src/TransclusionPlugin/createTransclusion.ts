import {SlateBlock} from '../editor'

export interface CreateTransclusionRequest {
  source: string // source publication version
  destination?: string // destination draft version (undefined if needs to create a new one)
  block: SlateBlock // publication block that will be transclude
  destinationPath?: number[] // destination path in which will be transclude to (draft destination path)
}

export async function createTransclusions({
  source,
  destination,
  block,
  destinationPath,
}) {
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
}
