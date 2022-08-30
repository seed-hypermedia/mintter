import {u} from 'unist-builder'
import {blockquote as buildBlockquote, paragraph, text} from '../../../..'

export const blockquote = u('root', [
  buildBlockquote({id: 'id'}, [
    paragraph([text('This is a header in a blockquote.')]),
  ]),
  paragraph([text('paragraph')]),
  buildBlockquote({id: 'id'}, [paragraph([text('This is a blockquote.')])]),
  buildBlockquote({id: 'id'}, [
    paragraph([
      text('some nested textwith '),
      text('bold', {strong: true}),
      text(' and '),
      text('italic', {emphasis: true}),
    ]),
  ]),
])
