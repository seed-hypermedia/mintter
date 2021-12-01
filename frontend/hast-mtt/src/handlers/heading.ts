import {heading as buildHeading, staticParagraph} from '@mintter/mttast-builder'
import {Element} from 'hast'
import {all} from '../all'
import {H} from '../types'

export function heading(h: H, node: Element) {
  const wrap = h.wrapText
  h.wrapText = false
  const result = buildHeading([staticParagraph(all(h, node))])
  h.wrapText = wrap

  return result
}
