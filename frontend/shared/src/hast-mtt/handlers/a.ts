import {createId, heading} from '../../mttast/builder'
import {isHeading} from '../../mttast/assertions'
import {all} from '../all'
import {H} from '../types'
import {resolve} from '../util/resolve'

// eslint-disable-next-line
export function a(h: H, node: any) {
  const children = all(h, node)

  if (node.children && node.children.length == 1) {
    if (isHeading(children[0])) {
      const id = createId()
      return heading({id}, children[0].children)
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
