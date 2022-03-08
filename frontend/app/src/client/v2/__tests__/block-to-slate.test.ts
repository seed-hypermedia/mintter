
import { embed, heading, Heading, link, paragraph, Statement, statement, staticParagraph, text } from '@mintter/mttast'
import { describe, expect, test } from 'vitest'
import { blockToSlate } from '../block-to-slate'
import { Block } from '../types'

describe('Transform: blockToSlate', () => {
  test('should qan empty annotations list', () => {
    let input: Block = {
      id: 'blockId',
      type: 'statement',
      text: 'Hello world',
      attributes: {},
      layers: []
    }

    let output: Statement = statement({ id: 'blockId' }, [
      paragraph([text('Hello world')])
    ])

    expect(blockToSlate(input)).toEqual(output)
  })

  test('should return a heading block', () => {


    let input: Block = {
      id: 'blockId',
      type: 'heading',
      text: 'Hello world',
      attributes: {},
      layers: []
    }

    let output: Heading = heading({ id: 'blockId' }, [
      staticParagraph([text('Hello world')])
    ])

    expect(blockToSlate(input)).toEqual(output)
  })

  test('basic marks with no trailing space', () => {

    let input = {
      id: 'blockId',
      type: 'statement',
      text: "A",
      layers: [
        { type: "strong", starts: [0], ends: [1], attributes: null },
        // { type: "emphasis", starts: [1], ends: [2], attributes: null },
      ],
      attributes: {},
    }

    let output: Statement = statement({ id: 'blockId' }, [paragraph([
      text('A', { strong: true }),
    ])])

    expect(blockToSlate(input as Block)).toEqual(output)
  })

  test('should return all the possible marks', () => {

    let input = {
      id: 'blockId',
      type: 'statement',
      text: "A B C D E F",
      layers: [
        { type: "subscript", starts: [0], ends: [2], attributes: null },
        { type: "emphasis", starts: [2], ends: [4], attributes: null },
        { type: "underline", starts: [4], ends: [6], attributes: null },
        { type: "strikethrough", starts: [6], ends: [8], attributes: null },
        { type: "superscript", starts: [8], ends: [10], attributes: null },
        { type: "subscript", starts: [10], ends: [11], attributes: null },
      ],
      attributes: {},
    }

    let output: Statement = statement({ id: 'blockId' }, [paragraph([
      text('A ', { subscript: true }),
      text('B ', { emphasis: true }),
      text('C ', { underline: true }),
      text('D ', { strikethrough: true }),
      text('E ', { superscript: true }),
      text('F', { subscript: true }),
    ])])

    expect(blockToSlate(input as Block)).toEqual(output)
  })

  test('should generate overlapping marks', () => {
    let input = {
      id: 'blockId',
      type: 'statement',
      text: 'Mintter is Awesome',
      layers: [
        { type: 'strong', starts: [0], ends: [10], attributes: null },
        { type: 'emphasis', starts: [8], ends: [18], attributes: null }
      ],
      attributes: {}
    }

    let output: Statement = statement({ id: 'blockId' }, [paragraph([
      text('Mintter ', { strong: true }),
      text('is', { strong: true, emphasis: true }),
      text(' Awesome', { emphasis: true })
    ])])

    expect(blockToSlate(input)).toEqual(output)
  })

  test('should transform no ASCII characters (emojis)', () => {
    let output: Statement = statement({ id: 'blockId' }, [
      paragraph([
        text('hello '),
        text('from 👨‍👩‍👧‍👦 family', { strong: true }),
      ])
    ])

    let input = {
      id: 'blockId',
      type: 'statement',
      text: 'hello from 👨‍👩‍👧‍👦 family',
      layers: [
        { type: 'strong', starts: [6], ends: [25], attributes: null }
      ],
    }

    expect(blockToSlate(input)).toEqual(output)
  })

  describe('Links', () => {
    test('Links: simple', () => {
      let input = {
        id: 'blockId',
        type: 'statement',
        text: "hello Mintter",
        layers: [
          { type: 'link', attributes: { url: 'https://mintter.com' }, starts: [6], ends: [13] }
        ]
      }

      let output: Statement = statement({ id: 'blockId' }, [
        paragraph([
          text('hello '),
          link({ url: 'https://mintter.com' }, [
            text('Mintter')
          ])
        ])
      ])

      expect(blockToSlate(input)).toEqual(output)
    })

    test('Links: simple 2', () => {


      let input = {
        id: 'blockId',
        type: 'statement',
        text: "AB",
        layers: [
          { type: 'link', attributes: { url: 'https://hola.com' }, starts: [0], ends: [1] },
          { type: 'strong', attributes: null, starts: [0], ends: [1] }
        ]
      }

      let output: Statement = statement({ id: 'blockId' }, [
        paragraph([
          link({ url: 'https://hola.com' }, [
            text('A', { strong: true }),
          ]),
          text('B')


        ])
      ])

      expect(blockToSlate(input)).toEqual(output)
    })

    test('Links: multiple links together', () => {
      let output: Statement = statement({ id: 'blockId' }, [
        paragraph([
          link({ url: 'https://mintter.com' }, [
            text('Mintter')
          ]),
          link({ url: 'https://demo.com' }, [
            text('demo')
          ])
        ])
      ])

      let input = {
        id: 'blockId',
        type: 'statement',
        text: "Mintterdemo",
        layers: [
          { type: 'link', attributes: { url: 'https://mintter.com' }, starts: [0], ends: [7] },
          { type: 'link', attributes: { url: 'https://demo.com' }, starts: [7], ends: [11] }
        ]
      }

      expect(blockToSlate(input)).toEqual(output)
    })

    test('Links: with marks', () => {
      let output: Statement = statement({ id: 'blockId' }, [
        paragraph([
          text('hello '),
          link({ url: 'https://mintter.com' }, [
            text('Mintter '), text('team!', { strong: true })
          ])
        ])
      ])

      let input = {
        id: 'blockId',
        type: 'statement',
        text: 'hello Mintter team!',
        layers: [
          { type: 'link', attributes: { url: 'https://mintter.com' }, starts: [6], ends: [19] },
          { type: 'strong', starts: [14], ends: [19], attributes: null },
        ]
      }

      expect(blockToSlate(input)).toEqual(output)
    })
  })

  describe('Embeds', () => {
    test('Embeds: simple', () => {
      let output: Statement = statement({ id: 'blockId' }, [
        paragraph([
          embed({ url: 'mtt://doc1/block1' }, [
            text('')
          ])
        ])
      ])

      let input = {
        id: 'blockId',
        type: 'statement',
        text: '\uFFFC',
        layers: [{
          type: 'embed', attributes: { url: 'mtt://doc1/block1' }, starts: [0], ends: [1]
        }]
      }

      expect(blockToSlate(input)).toEqual(output)
    })

    test('Embeds: multiple embeds together', () => {
      let output: Statement = statement({ id: 'blockId' }, [
        paragraph([
          embed({ url: 'mtt://doc1/block1' }, [
            text('')
          ]),
          embed({ url: 'mtt://doc2/block2' }, [
            text('')
          ])
        ])
      ])

      let input = {
        id: 'blockId',
        type: 'statement',
        text: '\uFFFC\uFFFC',
        layers: [{
          type: 'embed', attributes: { url: 'mtt://doc1/block1' }, starts: [0], ends: [1]
        }, {
          type: 'embed', attributes: { url: 'mtt://doc2/block2' }, starts: [1], ends: [2]
        }]
      }

      expect(blockToSlate(input)).toEqual(output)
    })

    test('Embeds: multiple embeds separated by marks', () => {
      let output: Statement = statement({ id: 'blockId' }, [
        paragraph([
          text('This '),
          embed({ url: 'mtt://doc1/block1' }, [
            text('')
          ]),
          text(' and also this are very '),
          text('important: ', { strong: true }),
          embed({ url: 'mtt://doc2/block2' }, [
            text('')
          ])
        ])
      ])

      let input = {
        id: 'blockId',
        type: 'statement',
        text: 'This \uFFFC and also this are very important: \uFFFC',
        layers: [{
          type: 'embed', attributes: { url: 'mtt://doc1/block1' }, starts: [5], ends: [6]
        }, { starts: [30], ends: [41], type: 'strong', attributes: null }, {
          type: 'embed', attributes: { url: 'mtt://doc2/block2' }, starts: [41], ends: [42]
        }]
      }

      expect(blockToSlate(input)).toEqual(output)
    })
  })



  test.skip('emojis', () => {
    let input = {
      id: 'blockId',
      type: 'statement',
      text: '😀 😎 👨‍👩‍👧‍👦',
      layers: [
        {
          type: 'emphasis', starts: [4], ends: [11], attributes: null
        }
      ]
    }

    let output: Statement = statement({ id: 'blockId' }, [
      paragraph([
        text('😀 😎 '),
        text('👨‍👩‍👧‍👦', { emphasis: true })
      ])
    ])

    expect(blockToSlate(input as Block)).toEqual(output)
  })

  test('combining layers', () => {
    let output: Statement = statement({ id: 'blockId' }, [
      paragraph([
        text('Alice', { strong: true }),
        text(', Bob and '),
        text('Carol', { strong: true }),
      ])
    ])

    let input = {
      id: 'blockId',
      type: 'statement',
      text: 'Alice, Bob and Carol',
      layers: [
        {
          type: 'strong', starts: [0, 15], ends: [5, 20], attributes: null
        }
      ]
    }

    expect(blockToSlate(input)).toEqual(output)
  })
})