import {describe, expect, test} from 'vitest'
import {Block, BlockNode} from '@mintter/shared'
import {
  serverBlockToEditorInline,
  serverChildrenToEditorChildren,
} from '../server-to-editor'
import {examples} from '../example-docs'
import {InlineContent} from '@app/blocknote-core'

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
            {text: 'world', type: 'text', styles: {bold: true}},
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
            {text: 'B', type: 'text', styles: {bold: true}},
            {text: 'C', type: 'text', styles: {bold: true, italic: true}},
            {text: 'D', type: 'text', styles: {italic: true}},
            {text: 'E', type: 'text', styles: {}},
          ],
          children: [],
        },
      ])
    })
  })

  describe('Server Block to Editor Inline: ', () => {
    test('no annotations', () => {
      const result: InlineContent[] = serverBlockToEditorInline(
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
      const result: InlineContent[] = serverBlockToEditorInline(
        new Block({
          text: 'ABC',
          annotations: [
            {type: 'strong', starts: [1], ends: [2], attributes: {}},
          ],
        }),
      )
      expect(result).toEqual([
        {text: 'A', type: 'text', styles: {}},
        {text: 'B', type: 'text', styles: {bold: true}},
        {text: 'C', type: 'text', styles: {}},
      ])
    })

    test('simple marks kitchen sink', () => {
      const result: InlineContent[] = serverBlockToEditorInline(
        new Block({
          text: '01234',
          annotations: [
            {type: 'strong', starts: [0], ends: [1], attributes: {}},
            {type: 'emphasis', starts: [1], ends: [2], attributes: {}},
            {type: 'underline', starts: [2], ends: [3], attributes: {}},
            {type: 'strike', starts: [3], ends: [4], attributes: {}},
            {type: 'code', starts: [4], ends: [5], attributes: {}},
          ],
        }),
      )
      expect(result).toEqual([
        {text: '0', type: 'text', styles: {bold: true}},
        {text: '1', type: 'text', styles: {italic: true}},
        {text: '2', type: 'text', styles: {underline: true}},
        {text: '3', type: 'text', styles: {strike: true}},
        {text: '4', type: 'text', styles: {code: true}},
      ])
    })

    test('overlapping annotations', () => {
      const result: InlineContent[] = serverBlockToEditorInline(
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
        {text: 'B', type: 'text', styles: {bold: true}},
        {text: 'C', type: 'text', styles: {bold: true, italic: true}},
        {text: 'D', type: 'text', styles: {italic: true}},
        {text: 'E', type: 'text', styles: {}},
      ])
    })

    test('link annotation', () => {
      const result: InlineContent[] = serverBlockToEditorInline(
        new Block({
          text: 'a link',
          annotations: [
            {
              type: 'link',
              ref: 'http://example.com',
              starts: [2],
              ends: [6],
            },
          ],
        }),
      )
      expect(result).toEqual([
        {text: 'a ', type: 'text', styles: {}},
        {
          type: 'link',
          href: 'http://example.com',
          content: [{text: 'link', type: 'text', styles: {}}],
        },
      ])
    })

    test('two link annotations', () => {
      const result: InlineContent[] = serverBlockToEditorInline(
        new Block({
          text: 'ok link ok link ok',
          annotations: [
            {
              type: 'link',
              ref: 'http://1',
              starts: [3],
              ends: [7],
            },
            {
              type: 'link',
              ref: 'http://2',
              starts: [11],
              ends: [15],
            },
          ],
        }),
      )
      expect(result).toEqual([
        {text: 'ok ', type: 'text', styles: {}},
        {
          type: 'link',
          href: 'http://1',
          content: [{text: 'link', type: 'text', styles: {}}],
        },
        {text: ' ok ', type: 'text', styles: {}},
        {
          type: 'link',
          href: 'http://2',
          content: [{text: 'link', type: 'text', styles: {}}],
        },
        {text: ' ok', type: 'text', styles: {}},
      ])
    })

    test('link annotation with bold inside', () => {
      const result: InlineContent[] = serverBlockToEditorInline(
        new Block({
          text: 'a strong link',
          annotations: [
            {
              type: 'link',
              ref: 'http://example.com',
              starts: [2],
              ends: [13],
            },
            {
              type: 'strong',
              starts: [2],
              ends: [8],
            },
          ],
        }),
      )
      expect(result).toEqual([
        {text: 'a ', type: 'text', styles: {}},
        {
          type: 'link',
          href: 'http://example.com',
          content: [
            {text: 'strong', type: 'text', styles: {bold: true}},
            {text: ' link', type: 'text', styles: {}},
          ],
        },
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
