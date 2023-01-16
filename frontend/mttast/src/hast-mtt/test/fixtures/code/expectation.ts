import {u} from 'unist-builder'
import {code as buildCode, paragraph, text} from '../../../../builder'

export const code = u('root', [
  buildCode({id: 'id'}, [paragraph([text('alpha();')])]),
  buildCode({id: 'id'}, [paragraph([text('bravo();')])]),
  buildCode({id: 'id'}, [paragraph([text('charlie();')])]),
  buildCode({id: 'id'}, [paragraph([text('foxtrot();')])]),
  buildCode({id: 'id'}, [paragraph([text('golf hotel(); india')])]),
  buildCode({id: 'id'}, [paragraph([text('juliet kilo();')])]),
  buildCode({id: 'id'}, [paragraph([text('lima(); mike')])]),
  buildCode({id: 'id'}, [paragraph([text('')])]),
  buildCode({id: 'id'}, [paragraph([text('november\noscar();\n papa')])]),
])
