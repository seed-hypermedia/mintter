import {isHeading} from '@mintter/mttast'
import {createId, heading} from '@mintter/mttast-builder'
import {all} from '../all'
import {H} from '../types'
import {resolve} from '../util/resolve'

export function a(h: H, node: any) {
  let children = all(h, node)

  if (node.children && node.children.length == 1) {
    if (isHeading(children[0])) {
      return heading({id: createId()}, children[0].children)
    }
  }

  let props = node.properties

  return props.href
    ? h(
        node,
        'link',
        {
          url: resolve(h, String(props.href || '') || null),
        },
        all(h, node),
      )
    : children
}
