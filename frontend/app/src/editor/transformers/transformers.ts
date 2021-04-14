import documents from '@mintter/api/documents/v1alpha/documents_pb';
import { buildDocument } from '@utils/generate';
import type { SlateBlock } from '@mintter/editor/editor';
import { ELEMENT_BLOCK_LIST } from '../hierarchy-plugin/defaults';
import { ELEMENT_BLOCK } from '../block-plugin/defaults';
import { ELEMENT_PARAGRAPH } from '../elements/defaults';
import { id as getId } from '@mintter/editor/id';
import type { Node, Text } from 'slate';
import { makeProto } from './make-proto';

export function publicationToEditor(document = buildDocument()): SlateBlock[] {
  return [
    {
      id: getId(),
      type: ELEMENT_BLOCK_LIST,
      listStyle: documents.ListStyle.NONE,
      children: [
        {
          type: ELEMENT_BLOCK,
          children: [
            {
              type: ELEMENT_PARAGRAPH,
              children: [
                {
                  text: 'Hello World',
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}

/**
 * transformers
 * - Document
 * - Link
 * - Block
 * - InlineElement
 * - TextRun
 * - Image
 * - Quote
 */

// export function documentSerialize(entry: SlateBlock[]): documents.Document {}
// export function documentDeserialize(entry: documents.Document): SlateBlock[] {}

// export function linkSerialize(entry: any): documents.Link {}
// export function linkDeserialize(entry: documents.Link): any {}
export type BlockNode = {
  type: string;
  id: string;
  style: documents.Block.Type;
  children: any[]; // TODO: create a blockChildrenType
};

export type BlockListNode = {
  id?: string;
  type: string;
  children: BlockNode[];
  listStyle: documents.ListStyle;
};
export function blockSerialize(
  entry: BlockNode,
  parentId?: string,
): documents.Block {
  const children = entry.children;
  const block = new documents.Block();
  block.setId(entry.id);
  block.setType(entry.style);
  if (parentId) {
    block.setParent(parentId);
  }
  children.map((child: any) => {
    if (child.type === 'p') {
      child.children.map((c: any) =>
        block.addElements(inlineElementSerialize(c)),
      );
    }
    if (child.type === 'block_list') {
      // TODO: transform blockList
      // create a block passing the current id as parentId
      // add blockId to childrens list
      block.setChildListStyle(documents.ListStyle.NONE);
      (child as BlockListNode).children.map(
        (blockChild: BlockNode, index: number) => {
          // blockSerialize(block, child.id))
          block.addChildren(blockChild.id, index);
        },
      );
    }
  });

  return block;
}
// export function blockDeserialize(entry: documents.Block): any {}
export type PartialTextRun = Partial<documents.TextRun.AsObject>;
export function createTextRun(
  entry: PartialTextRun,
): documents.TextRun.AsObject {
  return {
    text: '',
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    blockquote: false,
    linkKey: '',
    ...entry,
  };
}

export function inlineElementSerialize(
  entry: PartialTextRun | QuoteNode,
): documents.InlineElement {
  if ((entry as QuoteNode).type === 'quote') {
    return makeProto(new documents.InlineElement(), {
      quote: quoteSerialize(entry as QuoteNode),
    });
  }

  // textRun
  if (typeof (entry as PartialTextRun).text === 'string') {
    return makeProto(new documents.InlineElement(), {
      textRun: textRunSerialize(createTextRun(entry as PartialTextRun)),
    });
  }

  // TODO: images

  // no valid inlineElement
  throw new Error('== inlineElementSerialize: Not a valid entry value');
}
// export function inlineElementDeserialize(
//   entry: documents.InlineElement,
// ): Node {}

export function textRunSerialize(
  entry: Partial<documents.TextRun.AsObject>,
): documents.TextRun {
  return makeProto(new documents.TextRun(), entry);
}
export function textRunDeserialize(entry: documents.TextRun): Text {
  return entry.toObject();
}

// export function imageSerialize(entry: any): documents.Image {}
// export function imageDeserialize(entry: documents.Image): any {}

export type QuoteNode = {
  id: string;
  type: string;
  linkKey: string;
  startOffset?: number;
  endOffset?: number;
  children: any;
};
export function quoteSerialize(entry: QuoteNode): documents.Quote {
  return makeProto(new documents.Quote(), {
    linkKey: entry.linkKey,
    startOffset: entry.startOffset,
    endOffset: entry.endOffset,
  });
}
// export function quoteDeserialize(entry: documents.Quote): any {}
