import {TextStyle} from '@mintter/proto/v2/documents_pb'
import {toInlineElement, makeProto} from '../transformers'
import {InlineElement} from '@mintter/proto/v2/documents_pb'

test('toInlineElement: should return the correct proto', () => {
  expect(toInlineElement({text: 'bold inline test', bold: true})).toEqual(
    makeProto(new InlineElement(), {
      text: 'bold inline test',
      textStyle: makeProto(new TextStyle(), {bold: true}),
    }),
  )

  expect(toInlineElement({text: 'italic inline test', italic: true})).toEqual(
    makeProto(new InlineElement(), {
      text: 'italic inline test',
      textStyle: makeProto(new TextStyle(), {italic: true}),
    }),
  )

  expect(
    toInlineElement({text: 'underline inline test', underline: true}),
  ).toEqual(
    makeProto(new InlineElement(), {
      text: 'underline inline test',
      textStyle: makeProto(new TextStyle(), {underline: true}),
    }),
  )

  expect(toInlineElement({text: 'code inline test', code: true})).toEqual(
    makeProto(new InlineElement(), {
      text: 'code inline test',
      textStyle: makeProto(new TextStyle(), {code: true}),
    }),
  )

  expect(
    toInlineElement({
      text: 'combined inline test',
      code: true,
      italic: true,
      bold: true,
    }),
  ).toEqual(
    makeProto(new InlineElement(), {
      text: 'combined inline test',
      textStyle: makeProto(new TextStyle(), {
        code: true,
        italic: true,
        bold: true,
      }),
    }),
  )
})
