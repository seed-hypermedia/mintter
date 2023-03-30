import {createId, statement} from '../../mttast/builder'
import {isParagraph} from '../../mttast/assertions'
import type {MttastNode} from '../../mttast/types'
import {H, HastNode} from '../types'
import {wrapChildren} from '../util/wrap-children'

export function listItem(h: H, node: HastNode): MttastNode | Array<MttastNode> {
  // eslint-disable-next-line
  const children = wrapChildren(h, node) as any
  // if (children.length == 1) {
  //   let node = children[0]
  //   if (isParagraph(node)) {
  //     return statement({id: createId()}, [node])
  //   } else if (isPhrasingContent(node)) {
  //     return statement({id: createId()}, [paragraph([node])])
  //   }

  //   return node
  // }
  // let head = children[0]
  let index = -1

  while (++index < children.length) {
    const child = children[index]
    if (isParagraph(child)) {
      children[index] = statement({id: createId()}, [child])
    }
  }
  return children
}
