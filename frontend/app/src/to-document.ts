import * as documents from '@mintter/api/documents/v1alpha/documents_pb';
import {
  buildBlock,
  buildDocument,
  buildTextInlineElement,
} from '@utils/generate';
import { makeProto } from '@utils/make-proto';
import { ELEMENT_LINK } from './editor/link-plugin';
import { ELEMENT_QUOTE } from './editor/quote-plugin';
import type { SlateBlock, SlateLink } from './editor/types';
import { toInlineElement, toQuote, toTextRun } from './inline-element';
import type { SlateInlineElement } from './mintter-hooks';

export type ToDocumentProps = {
  id: string;
  title?: string;
  subtitle?: string;
  author: string;
  blocks: Array<SlateBlock>;
  childrenListStyle: documents.ListStyle;
};

export function toDocument({
  id,
  title = '',
  subtitle = '',
  author,
  blocks,
  childrenListStyle = documents.ListStyle.NONE,
}: ToDocumentProps): documents.Document {
  console.log('toDocument', { title, subtitle, blocks, id, author });
  const newDoc = makeProto<documents.Document.AsObject, documents.Document>(
    new documents.Document(),
    {
      id,
      author,
      title,
      subtitle,
      childrenListStyle,
    },
  );

  const blocksMap = newDoc.getBlocksMap();
  const linksMap = newDoc.getLinksMap();
  let childrenList: Array<string> = [];

  for (let slateBlock of blocks) {
    // add block to document's childrenList
    childrenList = [...childrenList, slateBlock.id];
    // contert slate block to doc block
    const block = makeProto<documents.Block.AsObject, documents.Block>(
      new documents.Block(),
      {
        id: slateBlock.id,
      },
    );

    const inlineElements = slateBlock.children
      .map((leaf) => {
        if ('text' in leaf) {
          return toInlineElement({ textRun: toTextRun(leaf) });
        }
        if (leaf.type == ELEMENT_LINK) {
          // add link to linksMap
          linksMap.set(leaf.id, toLink(leaf));

          return leaf.children.map((leafChild) =>
            toInlineElement({
              textRun: toTextRun({
                ...leafChild,
                linkKey: leaf.id,
              }),
            }),
          );
        }
        if (leaf.type == ELEMENT_QUOTE) {
          // add link to linksMap
          linksMap.set(leaf.id, toLink(leaf));

          return toInlineElement({ quote: toQuote(leaf) });
        }

        throw Error(`toDocument Error: Block -> inlineElement not supported`);
      })
      .flat();
    block.setElementsList(inlineElements);
    blocksMap.set(slateBlock.id, block);
  }

  newDoc.setChildrenList(childrenList);

  return newDoc;
}

function toLink(link: SlateLink): documents.Link {
  const newLink = new documents.Link();
  newLink.setUri(link.url);

  return newLink;
}
