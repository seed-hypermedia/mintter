import type { Document } from '@mintter/api/documents/v1alpha/documents'

import { ELEMENT_BLOCK } from './editor/block-plugin';
import { ELEMENT_LINK } from './editor/link-plugin';
import type { SlateBlock } from './editor/types';

export function toEditorValue(entry: Document): Array<SlateBlock> {
  let currentDoc = entry;

  const blocksMap = entry.blocks;
  const linksMap = entry.links;
  return currentDoc.children.map((blockId: string) => {
    let block = blocksMap[blockId]
    return {
      id: block?.id,
      type: ELEMENT_BLOCK,
      depth: 0,
      listStyle: block?.childListStyle,
      children: block?.elements.map(({ textRun, image, quote }) => {
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
