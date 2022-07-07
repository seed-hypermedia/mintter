import {image as buildImage, text} from '../..'
import {H} from '../types'

export function img(h: H, node: any) {
  const {src = '', title = '', alt = ''} = node.properties
  console.log('TRANSFORM IMAGE!', node)

  return buildImage({url: src, title, alt}, [text('')])
}
