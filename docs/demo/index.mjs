import {u} from 'unist-builder'
import {nanoid} from 'nanoid'
const demo = u(
  'root',
  {
    id: nanoid(20),
    title: 'Demo Document',
    subtitle: 'demo description',
    createdAt: new Date(),
  },
  [
    u('group', [
      u(
        'statement',
        {
          id: nanoid(8),
        },
        [u('paragraph', [u('text', `hello world. I'm the content of a normal statement`)])],
      ),
      u('heading', {id: nanoid(8)}, [
        u('staticParagraph', [u('text', `Heading + orderedList + nesting`)]),
        u('orderedList', [
          u('statement', {id: nanoid(8)}, [u('paragraph', [u('text', 'child 1')])]),
          u('statement', {id: nanoid(8)}, [
            u('paragraph', [u('text', 'child 2')]),
            u('orderedList', [
              u('statement', {id: nanoid(8)}, [u('paragraph', [u('text', 'nested child 2.1')])]),
              u('statement', {id: nanoid(8)}, [u('paragraph', [u('text', 'nested child 2.2')])]),
            ]),
          ]),
          u('statement', {id: nanoid(8)}, [u('paragraph', [u('text', 'child 3')])]),
        ]),
      ]),
      u(
        'heading',
        {
          id: nanoid(8),
        },
        [
          u('staticParagraph', [u('text', `A Heading`)]),
          u('orderedList', [
            u(
              'statement',
              {
                id: nanoid(8),
              },
              [u('paragraph', [u('text', 'Headings')])],
            ),
            u(
              'statement',
              {
                id: nanoid(8),
              },
              [u('paragraph', [u('text', 'Lists')])],
            ),
            u(
              'statement',
              {
                id: nanoid(8),
              },
              [u('paragraph', [u('text', 'Images')])],
            ),
            u(
              'statement',
              {
                id: nanoid(8),
              },
              [u('paragraph', [u('text', 'Embeds')])],
            ),
          ]),
        ],
      ),
      u(
        'heading',
        {
          id: nanoid(8),
        },
        [
          u('staticParagraph', [u('text', `Inline Elements`)]),
          u('group', [
            u(
              'statement',
              {
                id: nanoid(8),
              },
              [
                u('paragraph', [
                  u('text', {bold: true}, 'Inline elements'),
                  u('text', ' are a crucial part of our Document model. They can only live inside any '),
                  u('text', {code: true}, 'FlowContent'),
                  u('text', 'node.'),
                ]),
              ],
            ),
          ]),
        ],
      ),
      u('heading', {id: nanoid(8)}, [
        u('staticParagraph', [u('text', `Links and Embeds`)]),
        u('group', [
          u('statement', {id: nanoid(8)}, [
            u('paragraph', [
              u('text', 'We can also represent '),
              u('link', {id: nanoid(8), url: 'https://mintter.com'}, [u('text', 'external web links')]),
              u('text', ', and also embeds (mintter links): '),
              u('embed', {id: nanoid(8), url: `mtt://${nanoid(8)}/${nanoid(6)}`}, [u('text', '')]),
            ]),
          ]),
        ]),
      ]),
      u('heading', {id: nanoid(8)}, [
        u('staticParagraph', [u('text', `Code blocks and Blockquotes`)]),
        u('group', [
          u('code', {id: nanoid(8), lang: 'javascript', meta: null}, [
            u(
              'text',
              `function greeting(name) {
  console.log("Hello " + name + "!");
}

greeting('Horacio');`,
            ),
          ]),
          u('blockquote', {id: nanoid(8)}, [
            u('paragraph', [u('text', 'History doesn’t repeat itself. But it does rhyme.')]),
          ]),
          u('blockquote', {id: nanoid(8)}, [
            u('paragraph', [u('embed', {id: nanoid(8), url: `mtt://${nanoid(8)}/${nanoid(6)}`}, [u('text', '')])]),
          ]),
        ]),
      ]),
      u('heading', {id: nanoid(8)}, [
        u('staticParagraph', [u('text', `Video and Image`)]),
        u('group', [
          u('statement', {id: nanoid(8)}, [
            u('paragraph', [
              u('video', {id: nanoid(8), url: 'https://www.youtube.com/watch?v=NTfPtYJORck'}, [u('text', '')]),
            ]),
          ]),
          u('statement', {id: nanoid(8)}, [
            u('paragraph', [
              u(
                'image',
                {
                  id: nanoid(8),
                  alt: 'teamwork',
                  url: 'https://images.unsplash.com/photo-1587440871875-191322ee64b0?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=3451&q=80',
                },
                [u('text', '')],
              ),
            ]),
          ]),
        ]),
      ]),
    ]),
  ],
)

console.dir(demo, {depth: 'full'})

const result = {
  type: 'root',
  id: 'd3PbGCdR2rrgAzZsKGaM',
  title: 'Demo Document',
  subtitle: 'demo description',
  createdAt: '2021-07-29T11:34:58.724Z',
  children: [
    {
      type: 'group',
      children: [
        {
          type: 'statement',
          id: 'rgoaCktc',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  value: "hello world. I'm the content of a normal statement",
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          id: '6esS95Lz',
          children: [
            {
              type: 'staticParagraph',
              children: [
                {
                  type: 'text',
                  value: 'Heading + orderedList + nesting',
                },
              ],
            },
            {
              type: 'orderedList',
              children: [
                {
                  type: 'statement',
                  id: 'Uk_ZBkdl',
                  children: [
                    {
                      type: 'paragraph',
                      children: [{type: 'text', value: 'child 1'}],
                    },
                  ],
                },
                {
                  type: 'statement',
                  id: 'SD-ND3SM',
                  children: [
                    {
                      type: 'paragraph',
                      children: [{type: 'text', value: 'child 2'}],
                    },
                    {
                      type: 'orderedList',
                      children: [
                        {
                          type: 'statement',
                          id: 'zuoDDps2',
                          children: [
                            {
                              type: 'paragraph',
                              children: [
                                {
                                  type: 'text',
                                  value: 'nested child 2.1',
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: 'statement',
                          id: 'pndaIwNy',
                          children: [
                            {
                              type: 'paragraph',
                              children: [
                                {
                                  type: 'text',
                                  value: 'nested child 2.2',
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'statement',
                  id: '1tCeIcRa',
                  children: [
                    {
                      type: 'paragraph',
                      children: [{type: 'text', value: 'child 3'}],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          id: 'l3DDpuDd',
          children: [
            {
              type: 'staticParagraph',
              children: [{type: 'text', value: 'A Heading'}],
            },
            {
              type: 'orderedList',
              children: [
                {
                  type: 'statement',
                  id: 'SlJqKyO1',
                  children: [
                    {
                      type: 'paragraph',
                      children: [{type: 'text', value: 'Headings'}],
                    },
                  ],
                },
                {
                  type: 'statement',
                  id: 'vi-C25cK',
                  children: [
                    {
                      type: 'paragraph',
                      children: [{type: 'text', value: 'Lists'}],
                    },
                  ],
                },
                {
                  type: 'statement',
                  id: 'yyhRy0Ay',
                  children: [
                    {
                      type: 'paragraph',
                      children: [{type: 'text', value: 'Images'}],
                    },
                  ],
                },
                {
                  type: 'statement',
                  id: 'cycuLHiY',
                  children: [
                    {
                      type: 'paragraph',
                      children: [{type: 'text', value: 'Embeds'}],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          id: 'fVZC5-9W',
          children: [
            {
              type: 'staticParagraph',
              children: [{type: 'text', value: 'Inline Elements'}],
            },
            {
              type: 'group',
              children: [
                {
                  type: 'statement',
                  id: '4fCIZwOS',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'text',
                          bold: true,
                          value: 'Inline elements',
                        },
                        {
                          type: 'text',
                          value: ' are a crucial part of our Document model. They can only live inside any ',
                        },
                        {
                          type: 'text',
                          code: true,
                          value: 'FlowContent',
                        },
                        {type: 'text', value: 'node.'},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          id: 'CsHa33BG',
          children: [
            {
              type: 'staticParagraph',
              children: [{type: 'text', value: 'Links and Embeds'}],
            },
            {
              type: 'group',
              children: [
                {
                  type: 'statement',
                  id: 'QgdV_4Fo',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'text',
                          value: 'We can also represent ',
                        },
                        {
                          type: 'link',
                          id: 'nF7NvEbk',
                          url: 'https://mintter.com',
                          children: [
                            {
                              type: 'text',
                              value: 'external web links',
                            },
                          ],
                        },
                        {
                          type: 'text',
                          value: ', and also embeds (mintter links): ',
                        },
                        {
                          type: 'embed',
                          id: 'XuJZo_CV',
                          url: 'mtt://kxYn6Lse/cW7332',
                          children: [{type: 'text', value: ''}],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          id: 'pYxE3n_J',
          children: [
            {
              type: 'staticParagraph',
              children: [{type: 'text', value: 'Code blocks and Blockquotes'}],
            },
            {
              type: 'group',
              children: [
                {
                  type: 'code',
                  id: 'fC9_0rIs',
                  lang: 'javascript',
                  meta: null,
                  children: [
                    {
                      type: 'text',
                      value:
                        'function greeting(name) {\n' +
                        '  console.log("Hello " + name + "!");\n' +
                        '}\n' +
                        '\n' +
                        "greeting('Horacio');",
                    },
                  ],
                },
                {
                  type: 'blockquote',
                  id: 'AWKyKy0f',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'text',
                          value: 'History doesn’t repeat itself. But it does rhyme.',
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'blockquote',
                  id: 'whmPkisD',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'embed',
                          id: 'aBZc-mlJ',
                          url: 'mtt://XJJyOpJV/RcX9ag',
                          children: [{type: 'text', value: ''}],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          id: 'pwxizvgr',
          children: [
            {
              type: 'staticParagraph',
              children: [{type: 'text', value: 'Video and Image'}],
            },
            {
              type: 'group',
              children: [
                {
                  type: 'statement',
                  id: 'kp1EVl8C',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'video',
                          id: 'hFVpAy59',
                          url: 'https://www.youtube.com/watch?v=NTfPtYJORck',
                          children: [{type: 'text', value: ''}],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'statement',
                  id: 'XEuh-aU7',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'image',
                          id: 'AMWUy-Gm',
                          alt: 'teamwork',
                          url: 'https://images.unsplash.com/photo-1587440871875-191322ee64b0?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=3451&q=80',
                          children: [{type: 'text', value: ''}],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
