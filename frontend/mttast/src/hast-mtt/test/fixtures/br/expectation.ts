import {u} from 'unist-builder'
import {paragraph, text} from '../../../../builder'

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
