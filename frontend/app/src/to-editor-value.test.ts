import { Block, InlineElement, ListStyle, TextRun } from '@mintter/client';
import { buildDocument } from '@utils/generate';
import { toInlineElement, toLink, toTextRun } from './inline-element';
import { ELEMENT_BLOCK } from './editor/block-plugin';
import type { SlateBlock } from './editor/types';
import { toEditorValue } from './to-editor-value';
import { ELEMENT_LINK } from './editor/link-plugin';

describe('toEditorValue', () => {
  it('simple document', () => {
    const block = Block.fromPartial({
      id: 'block-1',
      parent: '',
      childListStyle: ListStyle.NONE,
      elements: [
        InlineElement.fromPartial({
          textRun: TextRun.fromPartial({ text: 'hello world' })
        })
      ]
    })

    const doc = buildDocument({
      blocks: [block],
      id: 'doc-id',
      childrenListStyle: ListStyle.NONE,
    });

    let expected: Array<SlateBlock> = [
      {
        type: ELEMENT_BLOCK,
        id: 'block-1',
        depth: 0,
        listStyle: ListStyle.NONE,
        children: [
          TextRun.fromPartial({
            text: 'hello world',
          }),
        ],
      },
    ];

    expect(toEditorValue(doc)).toEqual(expected);
  });

  it('with link', () => {
    const block = Block.fromPartial({
      id: 'block-1',
      parent: '',
      childListStyle: ListStyle.NONE,
      elements: [
        toInlineElement({
          textRun: toTextRun({ text: 'hello world', linkKey: 'link-key' }),
        })
      ]
    })

    const doc = buildDocument({
      blocks: [block],
      id: 'doc-id',
      childrenListStyle: ListStyle.NONE,
      links: {
        'link-key': toLink({
          type: ELEMENT_LINK,
          id: 'link-key',
          url: 'https://example.test',
          children: [
            toTextRun({
              text: 'hello world',
            }),
          ],
        })
      }
    });

    let expected: Array<SlateBlock> = [
      {
        type: ELEMENT_BLOCK,
        id: 'block-1',
        depth: 0,
        listStyle: ListStyle.NONE,
        children: [
          {
            type: ELEMENT_LINK,
            id: 'link-key',
            url: 'https://example.test',
            children: [
              toTextRun({
                text: 'hello world',
                linkKey: 'link-key',
              }),
            ],
          },
        ],
      },
    ];

    expect(toEditorValue(doc)).toEqual(expected);
  });
});
