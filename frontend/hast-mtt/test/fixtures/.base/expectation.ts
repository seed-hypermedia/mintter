import {link, paragraph, text} from '@mintter/mttast-builder'
import {u} from 'unist-builder'

export const base = u('root', [
  paragraph([link({url: 'http://some-other-url.com/relative.html'}, [text('example')])]),
  paragraph([link({url: 'http://example.com/relative.html'}, [text('example')])]),
  paragraph([link({url: 'http://example.com/relative.html'}, [text('example')])]),
  paragraph([link({url: 'http://example.com/relative.html'}, [text('example')])]),
  paragraph([text('example')]),
])
