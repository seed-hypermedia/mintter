import type { Node, Text } from 'slate';

import documents, {
  TextRun,
} from '@mintter/api/documents/v1alpha/documents_pb';
import type { SlateBlock } from '@mintter/editor/editor';

// import { buildDocument } from '@utils/generate';

// import { Block } from '../block-plugin/components/block';
import { ELEMENT_BLOCK } from '../block-plugin/defaults';
import { ELEMENT_PARAGRAPH } from '../elements/defaults';
import { ELEMENT_BLOCK_LIST } from '../hierarchy-plugin/defaults';
import { id as getId } from '../id';
import { makeProto } from './make-proto';

export function publicationToEditor(/* document = buildDocument() */): SlateBlock[] {
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
export type SlateDocument = {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  blocks: BlockListNode[];
};

export type DocumentSerializeEntry = {
  document: SlateDocument;
  blocks: [string, documents.Block][];
  links?: [string, LinkNode | QuoteNode][];
};

// TODO: create a function that returns a Map with all the blocks in the document (with the parents set and so on)
export function documentSerialize({
  document,
  blocks,
}: // links,
DocumentSerializeEntry): documents.Document {
  // possible improvement: we can receive a `Document` so we don't have to create a new document all the time?

  const { title, subtitle, author } = document;

  // 1. create a document (makeProto with title, subtitle, author, listStyle)
  const result = makeProto(new documents.Document(), {
    title,
    subtitle,
    author,
    childrenListStyle: document.blocks[0].listStyle,
  } as documents.Document.AsObject);

  // 2. set the blocksMap
  const blocksMap = result.getBlocksMap();
  setBlocksMap(blocksMap, blocks);

  // 3. set the linksMap
  // const linksMap = result.getLinksMap();

  // 4. set childrenList (by filtering blocksMap (parent === ''))
  result.setChildrenList(createChildrenList(blocks));

  return result;
}
// export function documentDeserialize(entry: documents.Document): SlateDocument {
//   // TODO: merge sibling links
// }

function setBlocksMap(map: any, blocks: [string, documents.Block][]): void {
  blocks.forEach(([id, block]: [string, documents.Block]) => {
    // map.set(id, block);
    map.set(id, block);
  });
}

function createChildrenList(
  blocks: [string, documents.Block][],
  parentId?: string,
) {
  const children: string[] = [];

  blocks.forEach(([id, block]: [string, documents.Block]) => {
    const parent: string = parentId === undefined ? '' : parentId;
    const blockParent = block.getParent();

    if (parent === blockParent) {
      children.push(id);
    }
  });

  return children;
}

export type LinkNode = {
  id: string;
  type: string;
  url: string;
  children: PartialTextRun[];
};
export function linkSerialize(entry: LinkNode | QuoteNode): documents.Link {
  return makeProto(new documents.Link(), {
    uri: entry.url,
  } as documents.Link.AsObject);
}
/**
 * trimTextRun
 *
 * remove all the false attributes from the text
 */

function trimTextRun(entry: PartialTextRun): PartialTextRun {
  const copy = { ...entry };

  Object.entries(copy).forEach(([key, value]) => {
    if (!value) delete (copy as any)[key as keyof TextRun];
  });

  return copy;
}
export function linkDeserialize(
  entry: documents.TextRun,
  link: documents.Link,
): LinkNode {
  const { linkKey, ...textProps } = entry.toObject();
  return {
    id: linkKey,
    type: 'link',
    url: link.getUri(),
    children: [
      {
        text: '',
        ...trimTextRun(textProps),
      },
    ],
  };
}
export type BlockNode = {
  type: string;
  id: string;
  style: documents.Block.Type;
  children: Node[] | BlockListNode[]; // TODO: create a blockChildrenType
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
      child.children.map((c: any, parentIndex: number) => {
        const inlineElements = inlineElementSerialize(c);

        if (Array.isArray(inlineElements)) {
          inlineElements.forEach(
            (elm: documents.InlineElement, childIndex: number) => {
              block.addElements(elm, parentIndex + childIndex);
            },
          );
        } else {
          block.addElements(inlineElements, parentIndex);
        }
      });
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
  entry: PartialTextRun | QuoteNode | LinkNode,
  // TODO: fix types (documents.InlineElement | documents.InlineElement[])
): documents.InlineElement | documents.InlineElement[] | undefined {
  if ('type' in entry) {
    if (entry.type === 'quote') {
      return makeProto(new documents.InlineElement(), {
        quote: quoteSerialize(entry as QuoteNode),
      });
    }

    if (entry.type === 'link') {
      // TODO: create link and add it to the linkMap
      // const link = linkSerialize(entry);
      return entry.children.map((linkChild: PartialTextRun) =>
        inlineElementSerialize({
          ...linkChild,
          linkKey: entry.id,
        }),
      ) as documents.InlineElement[];
    }
  }

  // textRun
  if ('text' in entry && typeof entry.text === 'string') {
    if (entry.text !== '') {
      return makeProto(new documents.InlineElement(), {
        textRun: textRunSerialize(createTextRun(entry)),
      });
    } else {
      return undefined;
    }
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
  url: string;
  startOffset?: number;
  endOffset?: number;
  children: Text[];
};
export function quoteSerialize(entry: QuoteNode): documents.Quote {
  return makeProto(new documents.Quote(), {
    linkKey: entry.id,
    startOffset: entry.startOffset,
    endOffset: entry.endOffset,
  });

  // TODO: create link too
}
export function quoteDeserialize(
  entry: documents.Quote,
  link: documents.Link,
): QuoteNode {
  const { linkKey, startOffset, endOffset } = entry.toObject();
  return {
    id: linkKey,
    type: 'quote',
    url: link.getUri(),
    startOffset,
    endOffset,
    children: [{ text: '' }],
  };
}
