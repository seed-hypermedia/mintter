import {Block, BlockNode} from '../.generated/documents/v1alpha/documents_pb'
import {blockNodeToSlate} from '../block-to-slate'
import {group, ol, paragraph, statement, text} from '../../mttast'
import {describe, expect, test} from 'vitest'

describe('blockNodeToSlate', () => {
  test('default group', () => {
    let input: Array<BlockNode> = [
      new BlockNode({
        block: new Block({
          id: 'b1',
          type: 'statement',
          text: 'Hello world',
          attributes: {},
          annotations: [],
          revision: '',
        }),
        children: [],
      }),
    ]

    let output = group([
      statement({id: 'b1', revision: ''}, [paragraph([text('Hello world')])]),
    ])

    expect(blockNodeToSlate(input, 'group')).toEqual(output)
  })

  test('ordered group', () => {
    let input: Array<BlockNode> = [
      new BlockNode({
        block: new Block({
          id: 'b1',
          type: 'statement',
          text: 'Hello world',
          attributes: {
            childrenType: 'orderedList',
          },
          annotations: [],
          revision: '',
        }),
        children: [
          new BlockNode({
            block: new Block({
              id: 'b2',
              type: 'statement',
              text: 'Nested item',
              attributes: {
                childrenType: 'group',
              },
              annotations: [],
            }),
            children: [],
          }),
        ],
      }),
    ]

    let output = group([
      statement({id: 'b1', revision: ''}, [
        paragraph([text('Hello world')]),
        ol([
          statement({id: 'b2', revision: ''}, [
            paragraph([text('Nested item')]),
          ]),
        ]),
      ]),
    ])

    expect(blockNodeToSlate(input, 'group')).toEqual(output)
  })
})
