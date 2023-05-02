import {
  embed,
  heading,
  Heading,
  image,
  link,
  paragraph,
  Statement,
  statement,
  staticParagraph,
  text,
  video,
} from '../../mttast'
import {Block} from '../.generated/documents/v1alpha/documents_pb'
import {describe, expect, test} from 'vitest'
import {blockToApi} from '../block-to-api'

describe('Transform: blockToApi', () => {
  test('should return an empty annotations list', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([text('Hello world')]),
    ])

    let output: Partial<Block> = {
      id: 'blockId',
      type: 'statement',
      text: 'Hello world',
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('should return a heading block', () => {
    let input: Heading = heading({id: 'blockId'}, [
      staticParagraph([text('Hello world')]),
    ])

    let output: Partial<Block> = {
      id: 'blockId',
      type: 'heading',
      text: 'Hello world',
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('should return all the possible marks', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([
        text('A ', {strong: true}),
        text('B ', {emphasis: true}),
        text('C ', {underline: true}),
        text('D ', {strikethrough: true}),
        text('E ', {superscript: true}),
        text('F', {subscript: true}),
      ]),
    ])

    let output = {
      id: 'blockId',
      type: 'statement',
      text: 'A B C D E F',
      annotations: [
        {type: 'strong', starts: [0], ends: [2], attributes: {}},
        {type: 'emphasis', starts: [2], ends: [4], attributes: {}},
        {type: 'underline', starts: [4], ends: [6], attributes: {}},
        {type: 'strikethrough', starts: [6], ends: [8], attributes: {}},
        {type: 'superscript', starts: [8], ends: [10], attributes: {}},
        {type: 'subscript', starts: [10], ends: [11], attributes: {}},
      ],
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('should generate overlapping marks', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([
        text('Mintter ', {strong: true}),
        text('is', {strong: true, emphasis: true}),
        text(' Awesome', {emphasis: true}),
      ]),
    ])

    let output = {
      id: 'blockId',
      type: 'statement',
      text: 'Mintter is Awesome',

      annotations: [
        {type: 'strong', starts: [0], ends: [10], attributes: {}},
        {type: 'emphasis', starts: [8], ends: [18], attributes: {}},
      ],
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test.only('should return colors', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([
        text('red ', {color: 'red'}),
        text('green', {color: 'green'}),
      ]),
    ])

    let output = {
      id: 'blockId',
      type: 'statement',
      text: 'red green',
      annotations: [
        {type: 'color', starts: [0], ends: [4], attributes: {color: 'red'}},
        {type: 'color', starts: [4], ends: [9], attributes: {color: 'green'}},
      ],
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('should transform no ASCII characters (emojis)', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([text('hello '), text('from 👨‍👩‍👧‍👦 family', {strong: true})]),
    ])

    let output = {
      id: 'blockId',
      type: 'statement',
      text: 'hello from 👨‍👩‍👧‍👦 family',

      annotations: [{type: 'strong', starts: [6], ends: [25], attributes: {}}],
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('Links: simple', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([
        text('hello '),
        link({url: 'https://mintter.com'}, [text('Mintter')]),
      ]),
    ])

    let output = {
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
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('Links: multiple links together', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([
        link({url: 'https://mintter.com'}, [text('Mintter')]),
        link({url: 'https://demo.com'}, [text('demo')]),
      ]),
    ])

    let output = {
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
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('Links: with marks', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([
        text('hello '),
        link({url: 'https://mintter.com'}, [
          text('Mintter '),
          text('team!', {strong: true}),
        ]),
      ]),
    ])

    let output = {
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
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('Images: simple', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([
        image({url: 'https://mintter.com/image', alt: ''}, [text('')]),
      ]),
    ])

    let output = {
      id: 'blockId',
      type: 'statement',
      text: '\uFFFC',

      annotations: [
        {
          type: 'image',
          attributes: {url: 'https://mintter.com/image', alt: ''},
          starts: [0],
          ends: [1],
        },
      ],
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('Images: simple + alt', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([
        image({url: 'https://mintter.com/image', alt: 'hello alt'}, [text('')]),
      ]),
    ])

    let output = {
      id: 'blockId',
      type: 'statement',
      text: '\uFFFC',

      annotations: [
        {
          type: 'image',
          attributes: {url: 'https://mintter.com/image', alt: 'hello alt'},
          starts: [0],
          ends: [1],
        },
      ],
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('Images: with more content', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([
        text('hello block with '),
        image({url: 'https://mintter.com/image', alt: ''}, [text('')]),
        text(' this image in between content'),
      ]),
    ])

    let output = {
      id: 'blockId',
      type: 'statement',
      text: 'hello block with \uFFFC this image in between content',

      annotations: [
        {
          type: 'image',
          attributes: {url: 'https://mintter.com/image', alt: ''},
          starts: [17],
          ends: [18],
        },
      ],
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('Videos: simple', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([
        video({url: 'https://mintter.com/video', alt: ''}, [text('')]),
      ]),
    ])

    let output = {
      id: 'blockId',
      type: 'statement',
      text: '\uFFFC',

      annotations: [
        {
          type: 'video',
          attributes: {url: 'https://mintter.com/video', alt: ''},
          starts: [0],
          ends: [1],
        },
      ],
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('Videos: simple + alt', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([
        video({url: 'https://mintter.com/video', alt: 'hello alt'}, [text('')]),
      ]),
    ])

    let output = {
      id: 'blockId',
      type: 'statement',
      text: '\uFFFC',

      annotations: [
        {
          type: 'video',
          attributes: {url: 'https://mintter.com/video', alt: 'hello alt'},
          starts: [0],
          ends: [1],
        },
      ],
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('Videos: with more content', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([
        text('hello block with '),
        video({url: 'https://mintter.com/video', alt: ''}, [text('')]),
        text(' this video in between content'),
      ]),
    ])

    let output = {
      id: 'blockId',
      type: 'statement',
      text: 'hello block with \uFFFC this video in between content',

      annotations: [
        {
          type: 'video',
          attributes: {url: 'https://mintter.com/video', alt: ''},
          starts: [17],
          ends: [18],
        },
      ],
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('Embeds: simple', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([embed({url: 'mintter://doc1/block1'}, [text('')])]),
    ])

    let output = {
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
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('Embeds: multiple embeds together', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([
        embed({url: 'mintter://doc1/block1'}, [text('')]),
        embed({url: 'mintter://doc2/block2'}, [text('')]),
      ]),
    ])

    let output = {
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
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('Embeds: multiple embeds separated by marks', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([
        text('This '),
        embed({url: 'mintter://doc1/block1'}, [text('')]),
        text(' and also this are very '),
        text('important: ', {strong: true}),
        embed({url: 'mintter://doc2/block2'}, [text('')]),
      ]),
    ])

    let output = {
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
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('emojis', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([text('😀 😎 '), text('👨‍👩‍👧‍👦', {emphasis: true})]),
    ])

    let output = {
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
    }

    expect(blockToApi(input)).toEqual(output)
  })

  test('combining layers', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([
        text('Alice', {strong: true}),
        text(', Bob and '),
        text('Carol', {strong: true}),
      ]),
    ])

    let output = {
      id: 'blockId',
      type: 'statement',
      text: 'Alice, Bob and Carol',
      annotations: [
        {
          attributes: {},
          type: 'strong',
          starts: [0, 15],
          ends: [5, 20],
        },
      ],
    }

    expect(blockToApi(input)).toEqual(output)
  })
})
