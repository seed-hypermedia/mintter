import {paragraph, text} from '@mintter/mttast-builder'
import {u} from 'unist-builder'

export const br = u('root', [
  paragraph([text('alpha\nbravo')]),
  // paragraph([text('\n')]),
  paragraph([text('echo')]),
  paragraph([text('foxtrot')]),
  paragraph([text('golf')]),
  paragraph([text('hotel')]),
  paragraph([text('india')]),
  paragraph([text('juliett')]),
])
