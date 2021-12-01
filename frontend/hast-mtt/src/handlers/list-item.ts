import {isFlowContent, isGroupContent, isPhrasingContent, MttastNode} from '@mintter/mttast'
import {createId, paragraph, statement} from '@mintter/mttast-builder'
import {all} from '../all'
import {H, HastNode} from '../types'

export function listItem(h: H, node: HastNode): MttastNode | Array<MttastNode> {
  let children = all(h, node)
  // let head = children[0]
  let index = -1

  while (++index < children.length) {
    let child = children[index]

    if (!isFlowContent(child) && !isGroupContent(child)) {
      if (isPhrasingContent(child)) {
        children[index] = statement({id: createId()}, [paragraph([child])])
      } else {
        children[index] = statement({id: createId()}, [child])
      }
    }
  }

  return children
}
