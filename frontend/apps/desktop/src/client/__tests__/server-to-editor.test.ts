import {describe, expect, test} from 'vitest'
import {Block, BlockNode} from '@mintter/shared'
import {
  serverBlockToEditorInline,
  serverChildrenToEditorChildren,
} from '../server-to-editor'
import {examples} from '../example-docs'

describe('Editor: ', () => {
  describe('Server to Editor: ', () => {
    test('empty/basic', () => {
      expect(serverChildrenToEditorChildren([])).toEqual([])
    })
    test('single empty paragraph', () => {
      const eChildren = serverChildrenToEditorChildren([
        new BlockNode({
          block: new Block({id: 'a', type: 'section', text: ''}),
        }),
      ])
      expect(eChildren).toEqual([
        {
          id: 'a',
          type: 'paragraph',
          props: {},
          content: [],
          children: [],
        },
      ])
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

    test('bolding', () => {
      const eChildren = serverChildrenToEditorChildren(
        examples.withBoldText.children,
      )
      expect(eChildren).toEqual([
        {
          id: '1',
          type: 'paragraph',
          props: {},
          content: [
            {text: 'hello ', type: 'text', styles: {}},
            {text: 'world', type: 'text', styles: {bold: 'true'}},
            {text: '!', type: 'text', styles: {}},
          ],
          children: [],
        },
      ])
    })

    test('overlap annotations', () => {
      const eChildren = serverChildrenToEditorChildren(
        examples.withOverlappingAnnotations.children,
      )
      expect(eChildren).toEqual([
        {
          id: '1',
          type: 'paragraph',
          props: {},
          content: [
            {text: 'A', type: 'text', styles: {}},
            {text: 'B', type: 'text', styles: {bold: 'true'}},
            {text: 'C', type: 'text', styles: {bold: 'true', italic: 'true'}},
            {text: 'D', type: 'text', styles: {italic: 'true'}},
            {text: 'E', type: 'text', styles: {}},
          ],
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
      const i0 = result[0]
      expect(i0).toEqual({
        type: 'text',
        text: 'ABC',
        styles: {},
      })
    })
    test('basic annotation', () => {
      const result = serverBlockToEditorInline(
        new Block({
          text: 'ABC',
          annotations: [
            {type: 'strong', starts: [1], ends: [2], attributes: {}},
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
        }),
      )
      expect(result).toEqual([
        {text: 'A', type: 'text', styles: {}},
        {text: 'B', type: 'text', styles: {bold: 'true'}},
        {text: 'C', type: 'text', styles: {bold: 'true', italic: 'true'}},
        {text: 'D', type: 'text', styles: {italic: 'true'}},
        {text: 'E', type: 'text', styles: {}},
      ])
    })
  })

  describe('Server Image Block to Editor: ', () => {
    test('basic', () => {
      const result = serverChildrenToEditorChildren([
        // A - no style
        // B - bold
        // C - bold + italic
        // D - italic
        // E - no style
        new BlockNode({
          block: new Block({
            id: 'a',
            type: 'image',
            text: '',
            annotations: [],
            attributes: {
              alt: 'alto',
            },
            ref: 'ipfs://ABC',
          }),
        }),
      ])
      expect(result).toEqual([
        {
          id: 'a',
          type: 'image',
          props: {
            alt: 'alto',
            url: 'ABC',
            // junk:
            backgroundColor: 'default',
            textAlignment: 'left',
            textColor: 'default',
          },
        },
      ])
    })
  })
})
