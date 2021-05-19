import * as documents from '@mintter/api/documents/v1alpha/documents_pb';
import {
  buildBlock,
  buildDocument,
  buildTextInlineElement,
} from '@utils/generate';
import { ELEMENT_LINK, SlateLink } from './editor/link-plugin';
import { ELEMENT_QUOTE } from './editor/quote-plugin';
import type { SlateBlock, SlateTextRun } from './editor/slate-block';
import type { SlateInlineElement } from './mintter-hooks';

export type ToDocumentProps = {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  blocks: SlateBlock[];
};
export function toDocument({
  id,
  title,
  subtitle,
  author,
  blocks,
}: ToDocumentProps): documents.Document {
  console.log('toDocument', { title, subtitle, blocks, id, author });

  const newDocument = buildDocument({
    title,
    subtitle,
    author,
    childrenListStyle: documents.ListStyle.NONE,
  });
  newDocument.clearBlocksMap();
  const blocksMap = newDocument.getBlocksMap();
  const linksMap = newDocument.getLinksMap();

  for (let block of blocks) {
    // const elementsList = block.children.map((child: SlateInlineElement) => {
    //   if (child.type === ELEMENT_LINK) {
    //     // create Link
    //     linksMap.set(child.id, toLink(child));
    //   }

    // });
    const newBlock = buildBlock({
      id: block.id,
      parent: '',
      type: block.styleType || documents.ListStyle.NONE,
    });
    newBlock.clearElementsList();
    const elementsList: documents.InlineElement[] = [];
    for (let child of block.children) {
      if (child.type) {
        if (child.type === ELEMENT_LINK) {
          // create link
          for (let textNode of child.children) {
            console.log({ linkChild: textNode });
            elementsList.push(
              buildTextInlineElement({ text: textNode, linkKey: child.id }),
            );
          }
        } else if (child.type === ELEMENT_QUOTE) {
          // create quote
        }
      }

      elementsList.push(buildTextInlineElement({ text: child.text }));
    }

    newBlock.setElementsList(elementsList);

    blocksMap.set(block.id, newBlock);
  }

  return newDocument;
}

function toLink(link: SlateLink): documents.Link {
  const newLink = new documents.Link();
  newLink.setUri(link.url);

  return newLink;
}
