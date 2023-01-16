import {u} from 'unist-builder'
import {paragraph, text} from '../../../../builder'

export const strikethrough = u('root', [
  paragraph([text('Hello World.', {strikethrough: true})]),
  paragraph([text('Hello World.', {strikethrough: true})]),
  paragraph([text('Hello World.', {strikethrough: true})]),
])
