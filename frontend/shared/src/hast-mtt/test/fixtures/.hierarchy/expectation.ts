import {u} from 'unist-builder'
import {ol, paragraph, statement, text, ul} from '../../../../builder'

export var hierarchy = u('root', [
  statement({id: 'id'}, [
    paragraph([text('Hierarchy')]),
    ul([
      statement({id: 'id'}, [paragraph([text('Alpha')])]),
      statement({id: 'id'}, [paragraph([text('Bravo')])]),
      statement({id: 'id'}, [
        paragraph([text('Charlie')]),
        ol([
          statement({id: 'id'}, [paragraph([text('Delta')])]),
          statement({id: 'id'}, [paragraph([text('Echo')])]),
          statement({id: 'id'}, [paragraph([text('Foxtrot')])]),
        ]),
      ]),
    ]),
  ]),
])
