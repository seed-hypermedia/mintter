import {createId, FlowContent, isFlowContent, isPhrasingContent, paragraph, statement} from '../..'
import {all} from '../all'
import {H, HastElememtChild} from '../types'

export function wrapListItems(h: H, node: HastElememtChild): Array<FlowContent> {
  const children = all(h, node)
  let index = -1

  while (++index < children.length) {
    const child = children[index]

    if (!isFlowContent(child)) {
      if (isPhrasingContent(child)) {
        children[index] = statement({id: createId()}, [paragraph([child])])
      } else {
        children[index] = statement({id: createId()}, [child])
      }
    }
  }

  return children as Array<FlowContent>
}
