import {image as buildImage, text} from '../..'
import {H} from '../types'

// eslint-disable-next-line
export function img(h: H, node: any) {
  const {src = '', title = '', alt = ''} = node.properties

  return buildImage({url: src, title, alt}, [text('')])
}
