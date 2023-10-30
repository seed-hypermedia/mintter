import {Block, BlockNode, Document} from '@mintter/shared'
import {describe, expect, test} from 'vitest'
import {createBlocksMap} from '../documents'

describe('Draft transformations', () => {
  describe('backend to blockMap', () => {
    test('single block', () => {
      let inputBlock = new Block({
        id: '1',
        text: 'hello',
        annotations: [],
        attributes: {},
      })
      let input = new Document({
        children: [
          new BlockNode({
            block: inputBlock,
            children: [],
          }),
        ],
      })

      let output = {
        '1': {
          parent: '',
          left: '',
          block: inputBlock,
        },
      }

      expect(createBlocksMap(input)).toEqual(output)
    })
  })
})
