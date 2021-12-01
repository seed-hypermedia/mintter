import {paragraph, text} from '@mintter/mttast-builder'
import {u} from 'unist-builder'

export const strikethrough = u('root', [
  paragraph([text('Hello World.', {strikethrough: true})]),
  paragraph([text('Hello World.', {strikethrough: true})]),
  paragraph([text('Hello World.', {strikethrough: true})]),
])
