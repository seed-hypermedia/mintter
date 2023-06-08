import {u} from 'unist-builder'
import {image as buildImage, paragraph, text} from '../../../../mttast/builder'

export const image = u('root', [
  buildImage({url: 'http://example.com', title: 'example', alt: 'example'}, [
    text(''),
  ]),

  buildImage({url: 'http://example.com', title: 'example', alt: ''}, [
    text(''),
  ]),

  buildImage({url: 'http://example.com', alt: 'example', title: ''}, [
    text(''),
  ]),

  buildImage({url: 'http://example.com', title: '', alt: ''}, [text('')]),

  buildImage({url: '', title: '', alt: ''}, [text('')]),
])
