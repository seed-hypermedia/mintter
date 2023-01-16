import {u} from 'unist-builder'
import {link, paragraph, text} from '../../../../builder'

export const a = u('root', [
  paragraph([link({url: 'http://example.com'}, [text('example')])]),
  paragraph([link({url: 'http://example.com'}, [text('example')])]),
  paragraph([text('example')]),
])
