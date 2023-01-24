import {u} from 'unist-builder'
import {
  link,
  paragraph,
  statement,
  text,
  ul as buildUl,
} from '../../../../mttast/builder'

export const ul2 = u('root', [
  buildUl([
    statement({id: 'id'}, [
      paragraph([
        text('timeout', {code: true}),
        text(' ('),
        text('30000', {code: true}),
        text(') - milliseconds to wait before ending a stalling test'),
      ]),
    ]),
    statement({id: 'id'}, [
      paragraph([
        text('timeout', {code: true}),
        text(' and a '),
        link({url: 'https://mintter.com'}, [text('mintter link')]),
        text(' with more '),
        text('formats', {underline: true}),
      ]),
    ]),
  ]),
  // eslint-disable-next-line
] as any)
