import {describe, expect, test} from 'vitest'
import {extractContent} from '../editor-to-server'

describe('Editor to Server: ', () => {
  describe('Extract Content: ', () => {
    test('overlapping annotation', () => {
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
    test('single annotation', () => {
      const extracted = extractContent([
        {type: 'text', text: 'Hello ', styles: {}},
        {type: 'text', text: 'world', styles: {bold: true}},
        {type: 'text', text: '!', styles: {}},
      ])
      expect(extracted).toEqual({
        text: 'Hello world!',
        annotations: [
          {
            type: 'strong',
            starts: [6],
            ends: [11],
          },
        ],
      })
    })
  })
  describe('Extract Links content: ', () => {
    test('single link', () => {
      const extracted = extractContent([
        {type: 'text', text: 'a', styles: {}},
        {
          type: 'link',
          content: [
            {type: 'text', text: 'good', styles: {bold: true}},
            {type: 'text', text: 'link', styles: {}},
          ],
          href: 'https://example.com',
        },
      ])
      expect(extracted).toEqual({
        text: 'agoodlink',
        annotations: [
          {
            type: 'strong',
            starts: [1],
            ends: [5],
          },
          {
            type: 'link',
            starts: [1],
            ends: [9],
            ref: 'https://example.com',
          },
        ],
      })
    })
  })
})
