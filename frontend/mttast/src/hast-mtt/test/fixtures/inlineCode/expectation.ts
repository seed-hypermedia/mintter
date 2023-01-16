import {u} from 'unist-builder'
import {paragraph, text} from '../../../../builder'

export const inlineCode = u('root', [
  paragraph([
    text('Regular. '),
    text('toString()', {code: true}),
    text('. Regular.'),
  ]),
  paragraph([
    text('Type the following in the Run dialog: '),
    text('cmd', {code: true}),
    text('.'),
  ]),
  paragraph([
    text('Regular. '),
    text('Sample text.', {code: true}),
    text(' Regular.'),
  ]),
  paragraph([
    text('Regular. '),
    text('toString()', {code: true}),
    text('. Regular.'),
  ]),
  paragraph([
    text('A simple equation: '),
    text('x', {code: true}),
    text(' = '),
    text('y', {code: true}),
    text(' + 2.'),
  ]),
])
