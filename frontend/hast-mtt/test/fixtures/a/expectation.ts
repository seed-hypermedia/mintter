import {link, paragraph, text} from '@mintter/mttast-builder'
import {u} from 'unist-builder'

export const a = u('root', [
  paragraph([link({url: 'http://example.com'}, [text('example')])]),
  paragraph([link({url: 'http://example.com'}, [text('example')])]),
  paragraph([text('example')]),
])
