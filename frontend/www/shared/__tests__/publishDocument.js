import {waitFor} from '@testing-library/react'
import {publish} from '../publishDocument'
import {nodeTypes} from '@mintter/editor'

const value = [
  {
    type: 'section',
    author: 'jghfdoqoiyqkjflakjdfhaijdsbcakjhc',
    children: [
      {
        type: 'p',
        children: [
          {
            text: 'Advertisement ',
            bold: true,
          },
        ],
      },
      {
        type: 'img',
        url: 'https://twemoji.maxcdn.com/36x36/1f603.png',
        children: [
          {
            text: '',
          },
        ],
      },
      {
        type: 'ul',
        children: [
          {
            type: 'li',
            children: [
              {
                text: '',
              },
              {
                type: 'a',
                url: 'https://nodeca.github.io/pica/demo/',
                children: [
                  {
                    text: 'pica',
                    bold: true,
                  },
                ],
              },
              {
                text: ' - high quality and fast image resize in browser.',
              },
            ],
          },
          {
            type: 'li',
            children: [
              {
                text: '',
              },
              {
                type: 'a',
                url: 'https://github.com/nodeca/babelfish/',
                children: [
                  {
                    text: 'babelfish',
                    bold: true,
                  },
                ],
              },
              {
                text:
                  ' - developer friendly i18n with plurals support and easy syntax.',
              },
            ],
          },
        ],
      },
      {
        type: 'p',
        children: [
          {
            text: 'You will like those projects!',
          },
        ],
      },
    ],
  },
]

const value2 = [
  {
    type: 'section',
    children: [
      {
        type: nodeTypes.typeP,
        children: [
          {
            text: 'Hello Paragraph',
          },
        ],
      },
      {
        type: nodeTypes.typeP,
        children: [
          {
            text: "I'm bold. ",
            bold: true,
          },
          {
            text: "I'm italic. ",
            italic: true,
          },
          {
            text: "I'm underline.",
            underline: true,
          },
        ],
      },
    ],
  },
]

describe('Publish document', () => {
  test('should parse the slate node tree', async () => {
    const result = publish(value)
  })
})
