import {describe, expect, test} from 'vitest'
import {Block, BlockNode} from '../.generated/documents/v1alpha/documents_pb'
import {
  serverBlockToEditorInline,
  serverChildrenToEditorChildren,
} from '../editor2/server-to-editor'

describe('Editor2: ', () => {
  describe('Server to Editor: ', () => {
    test('empty/basic', () => {
      expect(serverChildrenToEditorChildren([])).toEqual([])
    })
    test('single paragraph', () => {
      const eChildren = serverChildrenToEditorChildren([
        new BlockNode({
          block: new Block({id: 'a', type: 'section', text: 'hello'}),
        }),
      ])
      expect(eChildren).toEqual([
        {
          id: 'a',
          type: 'paragraph',
          props: {},
          content: [{text: 'hello', type: 'text', styles: {}}],
          children: [],
        },
      ])
    })
    test('two paragraphs', () => {
      const eChildren = serverChildrenToEditorChildren([
        new BlockNode({
          block: new Block({id: 'a', type: 'section', text: 'hello'}),
        }),
        new BlockNode({
          block: new Block({id: 'b', type: 'section', text: 'world'}),
        }),
      ])
      expect(eChildren).toEqual([
        {
          id: 'a',
          type: 'paragraph',
          props: {},
          content: [{text: 'hello', type: 'text', styles: {}}],
          children: [],
        },
        {
          id: 'b',
          type: 'paragraph',
          props: {},
          content: [{text: 'world', type: 'text', styles: {}}],
          children: [],
        },
      ])
    })
  })

  describe('Server Block to Editor Inline: ', () => {
    test('no annotations', () => {
      const result = serverBlockToEditorInline(
        new Block({text: 'ABC', annotations: []}),
      )
      expect(result.length).toEqual(1)
      expect(result[0]?.text).toEqual('ABC')
      expect(result[0]?.type).toEqual('text')
      expect(result[0]?.styles).toEqual({})
    })
    test('basic annotation', () => {
      const result = serverBlockToEditorInline(
        new Block({
          text: 'ABC',
          annotations: [
            {
              starts: [1],
              ends: [2],
              attributes: {bold: 'true'},
            },
          ],
        }),
      )
      expect(result).toEqual([
        {text: 'A', type: 'text', styles: {}},
        {text: 'B', type: 'text', styles: {bold: 'true'}},
        {text: 'C', type: 'text', styles: {}},
      ])
    })

    test('overlapping annotations', () => {
      const result = serverBlockToEditorInline(
        // A - no style
        // B - bold
        // C - bold + italic
        // D - italic
        // E - no style
        new Block({
          text: 'ABCDE',
          annotations: [
            {
              starts: [1],
              ends: [3],
              attributes: {bold: 'true'},
            },
            {
              starts: [2],
              ends: [4],
              attributes: {italic: 'true'},
            },
          ],
        }),
      )
      expect(result.length).toEqual(5)
      expect(result[0]?.text).toEqual('A')
      expect(result[1]?.text).toEqual('B')
      expect(result[2]?.text).toEqual('C')
      expect(result[3]?.text).toEqual('D')
      expect(result[4]?.text).toEqual('E')
      expect(result[0]?.styles).toEqual({})
      expect(result[1]?.styles).toEqual({bold: 'true'})
      expect(result[2]?.styles).toEqual({bold: 'true', italic: 'true'})
      expect(result[3]?.styles).toEqual({italic: 'true'})
      expect(result[4]?.styles).toEqual({})
    })
  })
})

// const ex1 = [
//   {
//     id: '91c64611-da17-4408-8a5f-6cb1c8f4ad11',
//     type: 'paragraph',
//     props: {
//       textColor: 'default',
//       backgroundColor: 'default',
//       textAlignment: 'left',
//     },
//     content: [
//       {type: 'text', text: 'hello ', styles: {}},
//       {type: 'text', text: 'example', styles: {bold: true}},
//       {type: 'text', text: ' world', styles: {}},
//     ],
//     children: [
//       {
//         id: '5bc97e0b-51dd-4620-bc6a-f5556a361025',
//         type: 'bulletListItem',
//         props: {
//           textColor: 'default',
//           backgroundColor: 'default',
//           textAlignment: 'left',
//         },
//         content: [{type: 'text', text: 'foo', styles: {}}],
//         children: [],
//       },
//       {
//         id: 'bcac6949-1142-4a8d-8be0-9c6218b037b1',
//         type: 'bulletListItem',
//         props: {
//           textColor: 'default',
//           backgroundColor: 'default',
//           textAlignment: 'left',
//         },
//         content: [{type: 'text', text: 'bar', styles: {}}],
//         children: [],
//       },
//     ],
//   },
// ]
