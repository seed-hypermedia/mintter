import {u} from 'unist-builder'
import {paragraph, text} from '../../../../builder'

export const strong = u('root', [
  paragraph([text('Hello World.', {strong: true})]),
  paragraph([text('Hello World.', {strong: true})]),
])
