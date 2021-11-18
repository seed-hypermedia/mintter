import { isParagraph, MttastNode } from '@mintter/mttast'
import { createId, statement } from '@mintter/mttast-builder'
import { H, HastNode } from '../types'
import { wrapChildren } from '../util/wrap-children'

export function listItem(h: H, node: HastNode): MttastNode | Array<MttastNode> {
  let children = wrapChildren(h, node) as any
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
    let child = children[index]
    if (isParagraph(child)) {
      children[index] = statement({ id: createId() }, [child])
    }
  }
  return children
}
