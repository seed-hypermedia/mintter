import {Element} from 'hast'
import {hasProperty} from 'hast-util-has-property'
import {convertElement} from 'hast-util-is-element'
import {ol as buildOl, ul as buildUl} from '../../builder'
import {all} from '../all'
import {H} from '../types'

const ol = convertElement('ol')

export function list(h: H, node: Element) {
  const isOrdered = ol(node)
  const children = all(h, node)
  let start = 1

  if (isOrdered) {
    start = hasProperty(node, 'start')
      ? // @ts-expect-error: `props` exist.
        Number.parseInt(String(node.properties.start), 10)
      : 1
  }

  return isOrdered ? buildOl({start}, children) : buildUl(children)
}
