import {paragraph, text} from '@mintter/mttast-builder'
import {u} from 'unist-builder'

export const emphasis = u('root', [
  paragraph([text('Hello World.', {emphasis: true})]),
  paragraph([text('Hello World.', {emphasis: true})]),
  paragraph([text('Hello World.', {emphasis: true})]),
])
