import type * as documents from '@mintter/api/documents/v1alpha/documents_pb';
import { ELEMENT_BLOCK } from './editor/block-plugin';
import { ELEMENT_LINK } from './editor/link-plugin';
import type { SlateBlock } from './editor/types';

export function toEditorValue(entry: documents.Document): Array<SlateBlock> {
  let currentDoc = entry.toObject();
  // console.log(
  //   '🚀 ~ file: to-document.ts ~ line 99 ~ currentDoc',
  //   JSON.stringify(currentDoc, null, 2),
  // );

  const blocksMap = entry.getBlocksMap();
  const linksMap = entry.getLinksMap();
  return currentDoc.childrenList.map((blockId: string) => {
    let block = blocksMap.get(blockId)?.toObject();
    return {
      id: block?.id,
      type: ELEMENT_BLOCK,
      depth: 0,
      listStyle: block?.childListStyle,
      children: block?.elementsList.map(({ textRun, image, quote }) => {
        if (textRun) {
          if (textRun.linkKey) {
            return {
              type: ELEMENT_LINK,
              url: linksMap.get(textRun.linkKey)?.toObject().uri,
              children: [textRun],
            };
          } else {
            return textRun;
          }
        }
      }),
    };
  });
}
