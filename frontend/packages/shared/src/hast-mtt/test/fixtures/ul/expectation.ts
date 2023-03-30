import {u} from 'unist-builder'
import {
  code,
  paragraph,
  statement,
  text,
  ul as buildUl,
} from '../../../../mttast/builder'

export const ul = u('root', [
  buildUl([
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
  buildUl([
    statement({id: 'id'}, [paragraph([text('Alpha')])]),
    statement({id: 'id'}, [paragraph([text('Bravo')])]),
    statement({id: 'id'}, [paragraph([text('Charlie')])]),
  ]),
  paragraph([text('Bar.')]),
  buildUl([
    statement({id: 'id'}, [paragraph([text('Alpha')])]),
    statement({id: 'id'}, [paragraph([text('Bravo')])]),
    statement({id: 'id'}, [paragraph([text('Charlie')])]),
    statement({id: 'id'}, [paragraph([text('Delta')])]),
    statement({id: 'id'}, [paragraph([text('Echo')])]),
    statement({id: 'id'}, [paragraph([text('Foxtrot')])]),
  ]),
  paragraph([text('Baz.')]),
  buildUl([statement({id: 'id'}, [paragraph([text('Something else')])])]),
  paragraph([text('Qux.')]),
  buildUl([statement({id: 'id'}, [paragraph([text('Something else')])])]),
  paragraph([text('Quux.')]),
  buildUl([statement({id: 'id'}, [paragraph([text('Something else')])])]),
  paragraph([text('Quuux.')]),
  buildUl([
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
  buildUl([
    statement({id: 'id'}, [paragraph([text('Alpha')])]),
    //@ts-ignore
    buildUl([
      statement({id: 'id'}, [paragraph([text('Bravo')])]),
      //@ts-ignore
      buildUl([statement({id: 'id'}, [paragraph([text('Charlie')])])]),
    ]),
  ]),
  // eslint-disable-next-line
] as any)
