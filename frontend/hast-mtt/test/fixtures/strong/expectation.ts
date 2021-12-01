import {paragraph, text} from '@mintter/mttast-builder'
import {u} from 'unist-builder'

export const strong = u('root', [
  paragraph([text('Hello World.', {strong: true})]),
  paragraph([text('Hello World.', {strong: true})]),
])
