import {code, ol as buildOl, paragraph, statement, text} from '@mintter/mttast-builder'
import {u} from 'unist-builder'

export const ol = u('root', [
  buildOl([
    statement({id: 'id'}, [paragraph([text('Alpha')])]),
    statement({id: 'id'}, [paragraph([text('Bravo')])]),
    code(
      {
        id: 'id',
      },
      [paragraph([text('charlie();')])],
    ),
  ]),
  paragraph([text('Foo.')]),
  buildOl([
    statement({id: 'id'}, [paragraph([text('Alpha')])]),
    statement({id: 'id'}, [paragraph([text('Bravo')])]),
    statement({id: 'id'}, [paragraph([text('Charlie')])]),
  ]),
  paragraph([text('Bar.')]),
  buildOl([
    statement({id: 'id'}, [paragraph([text('Alpha')])]),
    statement({id: 'id'}, [paragraph([text('Bravo')])]),
    statement({id: 'id'}, [paragraph([text('Charlie')])]),
    statement({id: 'id'}, [paragraph([text('Delta')])]),
    statement({id: 'id'}, [paragraph([text('Echo')])]),
    statement({id: 'id'}, [paragraph([text('Foxtrot')])]),
  ]),
  paragraph([text('Baz.')]),
  buildOl([statement({id: 'id'}, [paragraph([text('Something else')])])]),
  paragraph([text('Qux.')]),
  buildOl([statement({id: 'id'}, [paragraph([text('Something else')])])]),
  paragraph([text('Quux.')]),
  buildOl([statement({id: 'id'}, [paragraph([text('Something else')])])]),
  paragraph([text('Quuux.')]),
  buildOl([
    statement({id: 'id'}, [paragraph([text(' Bravo')])]),
    statement({id: 'id'}, [paragraph([text(' Charlie')])]),
    statement({id: 'id'}, [paragraph([text(' Delta')])]),
    statement({id: 'id'}, [paragraph([text('Echo')])]),
    statement({id: 'id'}, [paragraph([text('Foxtrot', {strong: true})])]),
    statement({id: 'id'}, [paragraph([text(' '), text('Golf', {strong: true})])]),
  ]),
  paragraph([text('Nested.')]),
  buildOl([
    statement({id: 'id'}, [paragraph([text('Alpha')])]),
    // @ts-ignore
    buildOl([
      statement({id: 'id'}, [paragraph([text('Bravo')])]),
      // @ts-ignore
      buildOl([statement({id: 'id'}, [paragraph([text('Charlie')])])]),
    ]),
  ]),
])
