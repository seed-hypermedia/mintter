import {u} from 'unist-builder'
import {
  code,
  ol as buildOl,
  paragraph,
  statement,
  text,
} from '../../../../builder'

export const ol = u('root', [
  buildOl({start: 2}, [
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
  buildOl({start: 1}, [
    statement({id: 'id'}, [paragraph([text('Alpha')])]),
    statement({id: 'id'}, [paragraph([text('Bravo')])]),
    statement({id: 'id'}, [paragraph([text('Charlie')])]),
  ]),
  paragraph([text('Bar.')]),
  buildOl({start: 3}, [
    statement({id: 'id'}, [paragraph([text('Alpha')])]),
    statement({id: 'id'}, [paragraph([text('Bravo')])]),
    statement({id: 'id'}, [paragraph([text('Charlie')])]),
    statement({id: 'id'}, [paragraph([text('Delta')])]),
    statement({id: 'id'}, [paragraph([text('Echo')])]),
    statement({id: 'id'}, [paragraph([text('Foxtrot')])]),
  ]),
  paragraph([text('Baz.')]),
  buildOl({start: 1}, [
    statement({id: 'id'}, [paragraph([text('Something else')])]),
  ]),
  paragraph([text('Qux.')]),
  buildOl({start: 1}, [
    statement({id: 'id'}, [paragraph([text('Something else')])]),
  ]),
  paragraph([text('Quux.')]),
  buildOl({start: 1}, [
    statement({id: 'id'}, [paragraph([text('Something else')])]),
  ]),
  paragraph([text('Quuux.')]),
  buildOl({start: 1}, [
    statement({id: 'id'}, [paragraph([text(' Bravo')])]),
    statement({id: 'id'}, [paragraph([text(' Charlie')])]),
    statement({id: 'id'}, [paragraph([text(' Delta')])]),
    statement({id: 'id'}, [paragraph([text('Echo')])]),
    statement({id: 'id'}, [paragraph([text('Foxtrot', {strong: true})])]),
    statement({id: 'id'}, [
      paragraph([text(' '), text('Golf', {strong: true})]),
    ]),
  ]),
  paragraph([text('Nested.')]),
  buildOl({start: 1}, [
    statement({id: 'id'}, [paragraph([text('Alpha')])]),
    // @ts-ignore
    buildOl({start: 1}, [
      statement({id: 'id'}, [paragraph([text('Bravo')])]),
      // @ts-ignore
      buildOl({start: 1}, [
        statement({id: 'id'}, [paragraph([text('Charlie')])]),
      ]),
    ]),
  ]),
])
