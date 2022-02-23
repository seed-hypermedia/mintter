import { Block } from "@app/client";
import { blockquote, code, embed, heading, link, paragraph, statement, staticParagraph, text } from "@mintter/mttast";

/**
 * TODOs:
 * - from Slate -> API -> Slate -> API should produce the same result (sorting problem)
 * - identity of a layer = type + attributes
 * - order annotations
 *   - check in this order: `start`, `type`, `attributes`
 * - try if I can add the unicode replacement character to embeds (and images) works
 *
 */

export const basicStatement = {
  entry: statement({ id: 'blockId' }, [paragraph([text('hello world')])]),
  expected: {
    id: 'blockId', // TODO: add the same id to both,
    type: 'statement',
    text: 'hello world',
    annotations: [],
    attributes: {}
  } as Block
}



export const basicHeading = heading({ id: 'blockId' }, [staticParagraph([text('hello heading')])])

export const basicBlockQuote = blockquote({ id: 'blockId' }, [paragraph([text('hello blockquote')])])

export const basicCodeblock = code({ id: 'blockId' }, [paragraph([text('hello code')])])

export const simpleMarks = {
  entry: statement({ id: 'blockId' }, [paragraph([
    text('A ', { strong: true }),
    text('B ', { emphasis: true }),
    text('C ', { underline: true }),
    text('D ', { strikethrough: true }),
    text('E ', { superscript: true }),
    text('F', { subscript: true }),
  ])]),
  expected: {
    id: 'blockId',
    text: "A B C D E F",
    annotations: [
      { "type": "strong", "start": 0, "end": 2 },
      { "type": "emphasis", "start": 2, "end": 4 },
      { "type": "underline", "start": 4, "end": 6 },
      { "type": "strikethrough", "start": 6, "end": 8 },
      { "type": "superscript", "start": 8, "end": 10 },
      { "type": "subscript", "start": 10, "end": 11 },
    ],
  } as Block
}

export const overlapMarks = {
  entry: statement({ id: 'blockId' }, [paragraph([
    text('Mintter ', { strong: true }),
    text('is', { strong: true, emphasis: true }),
    text(' Awesome', { emphasis: true })
  ])]),
  expected: {
    type: 'statement', text: 'Mintter is Awesome',
    annotations: [
      { type: 'strong', start: 0, end: 10 },
      { type: 'emphasis', start: 8, end: 18 }
    ],
    id: 'blockId',
    attributes: {}
  } as Block
}

export const noAsciiCharsAndMarks = {
  entry: statement({ id: 'blockId' }, [
    paragraph([
      text('hello '),
      text('from 👨‍👩‍👧‍👦 family', { strong: true }),
    ])
  ]), expected: {} as Block
}

export const simpleLink = statement([
  paragraph([
    text('hello '),
    link({ url: 'https://mintter.com' }, [
      text('Mintter')
    ])
  ])
])

export const linkWithMarks = {
  entry: statement([
    paragraph([
      text('hello '),
      link({ url: 'https://mintter.com' }, [
        text('Mintter '), text('team!', { strong: true })
      ])
    ])
  ]), expected: {
    id: 'blockId',
    type: 'statement',
    text: 'hello Mintter team!',
    annotations: [
      { type: 'link', attributes: { url: 'https://mintter.com' }, start: 6, end: 20 },
      { type: 'strong', start: 14, end: 20 },
    ],
    attributes: {}
  } as Block
}

export const simpleEmbed = statement([
  paragraph([
    embed({ url: 'mtt://doc1/block1' }, [
      text('')
    ])
  ])
])

export const multipleEmbeds = {
  entry: statement([
    paragraph([
      text('first embed: '),
      embed({ url: 'mtt://doc1/block1' }, [text('')]),
      text(' and second embed: '),
      embed({ url: 'mtt://doc2/block2' }, [text('')]),
    ])
  ]),
  expected: {
    id: 'blockId',
    type: 'statement',
    attributes: {},
    text: 'first embed: \uFFFC and second embed: \uFFFC',
    annotations: [
      { type: 'embed', attributes: { url: 'mtt://doc1/block1' }, start: 13, end: 14 },
      { type: 'embed', attributes: { url: 'mtt://doc2/block2' }, start: 33, end: 34 }
    ]
  } as Block
}

export const emojis = statement([
  paragraph([
    text('😀 😎 👨‍👩‍👧‍👦'),
  ])
])