import {createId, heading, isHeading} from '../../'
import {all} from '../all'
import {H} from '../types'
import {resolve} from '../util/resolve'

export function a(h: H, node: any) {
  const children = all(h, node)

  if (node.children && node.children.length == 1) {
    if (isHeading(children[0])) {
      return heading({id: createId()}, children[0].children)
    }
  }

  const props = node.properties

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
