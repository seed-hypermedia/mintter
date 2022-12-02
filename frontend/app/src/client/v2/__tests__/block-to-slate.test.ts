import {Block} from '@app/client'
import {
  embed,
  heading,
  image,
  link,
  paragraph,
  Statement,
  statement,
  staticParagraph,
  text,
  video,
} from '@app/mttast'
import {describe, expect, test} from 'vitest'
import {blockToSlate} from '../block-to-slate'

describe('Transform: blockToSlate', () => {
  test('should return an empty annotations list', () => {
    let input = Block.fromPartial({
      id: 'blockId',
      type: 'statement',
      text: 'Hello world',
      attributes: {},
      annotations: [],
    })

    let output = statement({id: 'blockId'}, [paragraph([text('Hello world')])])

    expect(blockToSlate(input)).toEqual(output)
  })

  test('should return a heading block', () => {
    let input = Block.fromPartial({
      id: 'blockId',
      type: 'heading',
      text: 'Hello world',
      attributes: {},
      annotations: [],
    })

    let output = heading({id: 'blockId'}, [
      staticParagraph([text('Hello world')]),
    ])

    expect(blockToSlate(input)).toEqual(output)
  })

  test('should return a block with a single letter and no annotations', () => {
    let input = Block.fromPartial({
      id: 'blockId',
      type: 'statement',
      text: 'h',
      attributes: {},
      annotations: [],
    })

    let output = statement({id: 'blockId'}, [paragraph([text('h')])])

    expect(blockToSlate(input)).toEqual(output)
  })

  test('basic marks with no trailing space', () => {
    let input = Block.fromPartial({
      id: 'blockId',
      type: 'statement',
      text: 'A',
      annotations: [
        {type: 'strong', starts: [0], ends: [1], attributes: {}},
        // { type: "emphasis", starts: [1], ends: [2], attributes: {} },
      ],
      attributes: {},
    })

    let output = statement({id: 'blockId'}, [
      paragraph([text('A', {strong: true})]),
    ])

    expect(blockToSlate(input as Block)).toEqual(output)
  })

  test('should return all the possible marks', () => {
    let input = Block.fromPartial({
      id: 'blockId',
      type: 'statement',
      text: 'A B C D E F',
      annotations: [
        {type: 'subscript', starts: [0], ends: [2], attributes: {}},
        {type: 'emphasis', starts: [2], ends: [4], attributes: {}},
        {type: 'underline', starts: [4], ends: [6], attributes: {}},
        {type: 'strikethrough', starts: [6], ends: [8], attributes: {}},
        {type: 'superscript', starts: [8], ends: [10], attributes: {}},
        {type: 'subscript', starts: [10], ends: [11], attributes: {}},
      ],
      attributes: {},
    })

    let output = statement({id: 'blockId'}, [
      paragraph([
        text('A ', {subscript: true}),
        text('B ', {emphasis: true}),
        text('C ', {underline: true}),
        text('D ', {strikethrough: true}),
        text('E ', {superscript: true}),
        text('F', {subscript: true}),
      ]),
    ])

    expect(blockToSlate(input as Block)).toEqual(output)
  })

  test('should generate overlapping marks', () => {
    let input = Block.fromPartial({
      id: 'blockId',
      type: 'statement',
      text: 'Mintter is Awesome',
      annotations: [
        {type: 'strong', starts: [0], ends: [10], attributes: {}},
        {type: 'emphasis', starts: [8], ends: [18], attributes: {}},
      ],
      attributes: {},
    })

    let output = statement({id: 'blockId'}, [
      paragraph([
        text('Mintter ', {strong: true}),
        text('is', {strong: true, emphasis: true}),
        text(' Awesome', {emphasis: true}),
      ]),
    ])

    expect(blockToSlate(input)).toEqual(output)
  })

  test('should transform no ASCII characters (emojis)', () => {
    let input = Block.fromPartial({
      id: 'blockId',
      type: 'statement',
      text: 'hello from 👨‍👩‍👧‍👦 family',
      annotations: [{type: 'strong', starts: [6], ends: [25], attributes: {}}],
    })

    let output = statement({id: 'blockId'}, [
      paragraph([text('hello '), text('from 👨‍👩‍👧‍👦 family', {strong: true})]),
    ])

    expect(blockToSlate(input)).toEqual(output)
  })

  describe('Links', () => {
    test('Links: simple', () => {
      let input = Block.fromPartial({
        id: 'blockId',
        type: 'statement',
        text: 'hello Mintter',
        annotations: [
          {
            type: 'link',
            attributes: {url: 'https://mintter.com'},
            starts: [6],
            ends: [13],
          },
        ],
      })

      let output = statement({id: 'blockId'}, [
        paragraph([
          text('hello '),
          link({url: 'https://mintter.com'}, [text('Mintter')]),
          text(''),
        ]),
      ])

      expect(blockToSlate(input)).toEqual(output)
    })

    test('Links: simple 2', () => {
      let input = Block.fromPartial({
        id: 'blockId',
        type: 'statement',
        text: 'AB',
        annotations: [
          {
            type: 'link',
            attributes: {url: 'https://hola.com'},
            starts: [0],
            ends: [1],
          },
          {type: 'strong', attributes: {}, starts: [0], ends: [1]},
        ],
      })

      let output: Statement = statement({id: 'blockId'}, [
        paragraph([
          text(''),
          link({url: 'https://hola.com'}, [text('A', {strong: true})]),
          text(''),
          text('B'),
        ]),
      ])

      expect(blockToSlate(input)).toEqual(output)
    })

    test('Links: multiple links together', () => {
      let input = Block.fromPartial({
        id: 'blockId',
        type: 'statement',
        text: 'Mintterdemo',
        annotations: [
          {
            type: 'link',
            attributes: {url: 'https://mintter.com'},
            starts: [0],
            ends: [7],
          },
          {
            type: 'link',
            attributes: {url: 'https://demo.com'},
            starts: [7],
            ends: [11],
          },
        ],
      })

      let output = statement({id: 'blockId'}, [
        paragraph([
          text(''),
          link({url: 'https://mintter.com'}, [text('Mintter')]),
          text(''),
          link({url: 'https://demo.com'}, [text('demo')]),
          text(''),
        ]),
      ])

      expect(blockToSlate(input)).toEqual(output)
    })

    test('Links: with marks', () => {
      let input = Block.fromPartial({
        id: 'blockId',
        type: 'statement',
        text: 'hello Mintter team!',
        annotations: [
          {
            type: 'link',
            attributes: {url: 'https://mintter.com'},
            starts: [6],
            ends: [19],
          },
          {type: 'strong', starts: [14], ends: [19], attributes: {}},
        ],
      })

      let output = statement({id: 'blockId'}, [
        paragraph([
          text('hello '),
          link({url: 'https://mintter.com'}, [
            text('Mintter '),
            text('team!', {strong: true}),
          ]),
          text(''),
        ]),
      ])

      expect(blockToSlate(input)).toEqual(output)
    })
  })

  test('Images: simple', () => {
    let input = {
      id: 'blockId',
      type: 'statement',
      text: '\uFFFC',
      attributes: {
        childrenType: 'group',
      },
      annotations: [
        {
          type: 'image',
          attributes: {url: 'https://mintter.com/image', alt: ''},
          starts: [0],
          ends: [1],
        },
      ],
    }

    let output: Statement = statement({id: 'blockId'}, [
      paragraph([
        text(''),
        image({url: 'https://mintter.com/image', alt: ''}, [text('')]),
        text(''),
      ]),
    ])

    expect(blockToSlate(input)).toEqual(output)
  })

  test('Images: simple + alt', () => {
    let input = {
      id: 'blockId',
      type: 'statement',
      text: '\uFFFC',
      attributes: {
        childrenType: 'group',
      },
      annotations: [
        {
          type: 'image',
          attributes: {url: 'https://mintter.com/image', alt: 'hello alt'},
          starts: [0],
          ends: [1],
        },
      ],
    }

    let output: Statement = statement({id: 'blockId'}, [
      paragraph([
        text(''),
        image({url: 'https://mintter.com/image', alt: 'hello alt'}, [text('')]),
        text(''),
      ]),
    ])

    expect(blockToSlate(input)).toEqual(output)
  })

  test('Images: with more content', () => {
    let input = {
      id: 'blockId',
      type: 'statement',
      text: 'hello block with \uFFFC this image in between content',
      attributes: {
        childrenType: 'group',
      },
      annotations: [
        {
          type: 'image',
          attributes: {url: 'https://mintter.com/image', alt: ''},
          starts: [17],
          ends: [18],
        },
      ],
    }

    let output: Statement = statement({id: 'blockId'}, [
      paragraph([
        text('hello block with '),
        image({url: 'https://mintter.com/image', alt: ''}, [text('')]),
        text(''),
        text(' this image in between content'),
      ]),
    ])

    expect(blockToSlate(input)).toEqual(output)
  })

  test('Videos: simple', () => {
    let input = {
      id: 'blockId',
      type: 'statement',
      text: '\uFFFC',
      attributes: {
        childrenType: 'group',
      },
      annotations: [
        {
          type: 'video',
          attributes: {url: 'https://mintter.com/video', alt: ''},
          starts: [0],
          ends: [1],
        },
      ],
    }

    let output: Statement = statement({id: 'blockId'}, [
      paragraph([
        text(''),
        video({url: 'https://mintter.com/video', alt: ''}, [text('')]),
        text(''),
      ]),
    ])

    expect(blockToSlate(input)).toEqual(output)
  })

  test('Videos: simple + alt', () => {
    let input = {
      id: 'blockId',
      type: 'statement',
      text: '\uFFFC',
      attributes: {
        childrenType: 'group',
      },
      annotations: [
        {
          type: 'video',
          attributes: {url: 'https://mintter.com/video', alt: 'hello alt'},
          starts: [0],
          ends: [1],
        },
      ],
    }

    let output: Statement = statement({id: 'blockId'}, [
      paragraph([
        text(''),
        video({url: 'https://mintter.com/video', alt: 'hello alt'}, [text('')]),
        text(''),
      ]),
    ])

    expect(blockToSlate(input)).toEqual(output)
  })

  test('Videos: with more content', () => {
    let input = {
      id: 'blockId',
      type: 'statement',
      text: 'hello block with \uFFFC this video in between content',
      attributes: {
        childrenType: 'group',
      },
      annotations: [
        {
          type: 'video',
          attributes: {url: 'https://mintter.com/video', alt: ''},
          starts: [17],
          ends: [18],
        },
      ],
    }

    let output: Statement = statement({id: 'blockId'}, [
      paragraph([
        text('hello block with '),
        video({url: 'https://mintter.com/video', alt: ''}, [text('')]),
        text(''),
        text(' this video in between content'),
      ]),
    ])

    expect(blockToSlate(input)).toEqual(output)
  })

  describe('Embeds', () => {
    test('Embeds: simple', () => {
      let input = Block.fromPartial({
        id: 'blockId',
        type: 'statement',
        text: '\uFFFC',
        annotations: [
          {
            type: 'embed',
            attributes: {url: 'mintter://doc1/block1'},
            starts: [0],
            ends: [1],
          },
        ],
      })

      let output = statement({id: 'blockId'}, [
        paragraph([
          text(''),
          embed({url: 'mintter://doc1/block1'}, [text('')]),
          text(''),
        ]),
      ])

      expect(blockToSlate(input)).toEqual(output)
    })

    test('Embeds: multiple embeds together', () => {
      let input = Block.fromPartial({
        id: 'blockId',
        type: 'statement',
        text: '\uFFFC\uFFFC',
        annotations: [
          {
            type: 'embed',
            attributes: {url: 'mintter://doc1/block1'},
            starts: [0],
            ends: [1],
          },
          {
            type: 'embed',
            attributes: {url: 'mintter://doc2/block2'},
            starts: [1],
            ends: [2],
          },
        ],
      })

      let output = statement({id: 'blockId'}, [
        paragraph([
          text(''),
          embed({url: 'mintter://doc1/block1'}, [text('')]),
          text(''),
          embed({url: 'mintter://doc2/block2'}, [text('')]),
          text(''),
        ]),
      ])

      expect(blockToSlate(input)).toEqual(output)
    })

    test('Embeds: multiple embeds separated by marks', () => {
      let input = Block.fromPartial({
        id: 'blockId',
        type: 'statement',
        text: 'This \uFFFC and also this are very important: \uFFFC',
        annotations: [
          {
            type: 'embed',
            attributes: {url: 'mintter://doc1/block1'},
            starts: [5],
            ends: [6],
          },
          {starts: [30], ends: [41], type: 'strong', attributes: {}},
          {
            type: 'embed',
            attributes: {url: 'mintter://doc2/block2'},
            starts: [41],
            ends: [42],
          },
        ],
      })

      let output = statement({id: 'blockId'}, [
        paragraph([
          text('This '),
          embed({url: 'mintter://doc1/block1'}, [text('')]),
          text(''),
          text(' and also this are very '),
          text('important: ', {strong: true}),
          embed({url: 'mintter://doc2/block2'}, [text('')]),
          text(''),
        ]),
      ])

      expect(blockToSlate(input)).toEqual(output)
    })
  })

  test.skip('emojis', () => {
    let input = Block.fromPartial({
      id: 'blockId',
      type: 'statement',
      text: '😀 😎 👨‍👩‍👧‍👦',
      annotations: [
        {
          type: 'emphasis',
          starts: [4],
          ends: [11],
          attributes: {},
        },
      ],
    })

    let output = statement({id: 'blockId'}, [
      paragraph([text('😀 😎 '), text('👨‍👩‍👧‍👦', {emphasis: true})]),
    ])

    expect(blockToSlate(input as Block)).toEqual(output)
  })

  test('combining layers', () => {
    let input = Block.fromPartial({
      id: 'blockId',
      type: 'statement',
      text: 'Alice, Bob and Carol',
      annotations: [
        {
          type: 'strong',
          starts: [0, 15],
          ends: [5, 20],
          attributes: {},
        },
      ],
    })

    let output = statement({id: 'blockId'}, [
      paragraph([
        text('Alice', {strong: true}),
        text(', Bob and '),
        text('Carol', {strong: true}),
      ]),
    ])

    expect(blockToSlate(input)).toEqual(output)
  })
})
