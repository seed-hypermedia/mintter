import {u} from 'unist-builder'
import {paragraph, text} from '../../../../mttast/builder'

export const underline = u('root', [
  paragraph([text('Hello World.', {underline: true})]),
])
