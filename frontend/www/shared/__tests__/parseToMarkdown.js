import {parseToMarkdown} from '../parseToMarkdown'

const sectionChildren = [
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
]

describe('Parse to Markdown', () => {
  test('should parse the slate node tree', async () => {
    expect(sectionChildren.map(parseToMarkdown).join(''))
      .toMatchInlineSnapshot(`
      "**Advertisement** 

      - [**pica**](https://nodeca.github.io/pica/demo/) - high quality and fast image resize in browser.
      - [**babelfish**](https://github.com/nodeca/babelfish/) - developer friendly i18n with plurals support and easy syntax.

      You will like those projects!
      "
    `)
  })
})
