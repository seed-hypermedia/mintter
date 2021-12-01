import {all} from '../all'
import {H} from '../types'
import {resolve} from '../util/resolve'

export function a(h: H, node: any) {
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
    : all(h, node)
}
