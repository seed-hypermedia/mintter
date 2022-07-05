import {u} from 'unist-builder'
import {image as buildImage, paragraph, text} from '../../../..'

export const image = u('root', [
  paragraph([buildImage({url: 'http://example.com', title: 'example', alt: 'example'}, [text('')])]),
  paragraph([buildImage({url: 'http://example.com', title: 'example', alt: ''}, [text('')])]),
  paragraph([buildImage({url: 'http://example.com', alt: 'example', title: ''}, [text('')])]),
  paragraph([buildImage({url: 'http://example.com', title: '', alt: ''}, [text('')])]),
  paragraph([buildImage({url: '', title: '', alt: ''}, [text('')])]),
])
