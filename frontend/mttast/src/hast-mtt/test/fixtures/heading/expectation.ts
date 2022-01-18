import {u} from 'unist-builder'
import {heading as buildHeading, staticParagraph, text} from '../../../..'

export const heading = u('root', [
  buildHeading({id: 'id'}, [staticParagraph([text('h1')])]),
  buildHeading({id: 'id'}, [staticParagraph([text('h2')])]),
  buildHeading({id: 'id'}, [staticParagraph([text('h3')])]),
  buildHeading({id: 'id'}, [staticParagraph([text('h4')])]),
  buildHeading({id: 'id'}, [staticParagraph([text('h5')])]),
  buildHeading({id: 'id'}, [staticParagraph([text('h6')])]),
])
