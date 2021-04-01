import documents from '@mintter/api/documents/v1alpha/documents_pb';
import { buildDocument } from '@utils/generate';
import type { SlateBlock } from '@mintter/editor/editor';
import { ELEMENT_BLOCK_LIST } from '../hierarchy-plugin/defaults';
import { ELEMENT_BLOCK } from '../block-plugin/defaults';
import { ELEMENT_PARAGRAPH } from '../elements/defaults';
import { id as getId } from '@mintter/editor/id';

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
