import {PhrasingContent} from '../../mttast/types'
import {createId, paragraph, statement} from '../../mttast/builder'
import {isFlowContent, isPhrasingContent} from '../../mttast/assertions'
import type {FlowContent} from '../../mttast/types'
import {all} from '../all'
import {H, HastElememtChild} from '../types'

export function wrapListItems(
  h: H,
  node: HastElememtChild,
): Array<FlowContent> {
  const children = all(h, node)
  let index = -1

  while (++index < children.length) {
    const child = children[index]

    if (!isFlowContent(child)) {
      if (isPhrasingContent<PhrasingContent>(child)) {
        children[index] = statement({id: createId()}, [paragraph([child])])
      } else {
        children[index] = statement({id: createId()}, [child])
      }
    }
  }

  return children as Array<FlowContent>
}
