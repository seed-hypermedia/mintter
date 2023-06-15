import {describe, expect, test} from 'vitest'
import {
  extractContent,
  editorBlockToServerBlock,
} from '../editor/editor-to-server'

describe('Editor to Server: ', () => {
  describe('Extract Content: ', () => {
    test('single annotation', () => {
      const extracted = extractContent([
        {type: 'text', text: 'A', styles: {}},
        {type: 'text', text: 'B', styles: {bold: true}},
        {type: 'text', text: 'C', styles: {bold: true, italic: true}},
        {type: 'text', text: 'D', styles: {italic: true}},
        {type: 'text', text: 'E', styles: {}},
      ])
      expect(extracted).toEqual({
        text: 'ABCDE',
        annotations: [
          {
            type: 'strong',
            starts: [1],
            ends: [3],
          },
          {
            type: 'emphasis',
            starts: [2],
            ends: [4],
          },
        ],
      })
    })
  })
})
