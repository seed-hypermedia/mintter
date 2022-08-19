import {one} from './one'
import {H, HastNode} from './types'

// eslint-disable-next-line
export function all(h: H, parent: HastNode): Array<any> {
  const nodes = parent.children || []
  const values = []
  let index = -1
  let length = nodes.length
  let child = nodes[index + 1]

  // Trim initial and final `<br>`s.
  // They’re not semantic per HTML
  while (child && child.type == 'element' && child.tagName == 'br') {
    index++
    child = nodes[index + 1]
  }

  child = nodes[length - 1]

  while (length - 1 > index && child && child.type == 'element' && child.tagName == 'br') {
    length--
    child = nodes[length - 1]
  }

  while (++index < length) {
    const result = one(h, nodes[index], parent)
    if (Array.isArray(result)) {
      values.push(
        ...result.map((val) => {
          // eslint-disable-next-line
          let {position, ...props} = val
          return props
        }),
      )
    } else if (result) {
      // eslint-disable-next-line
      const {position, ...node} = result
      values.push(node)
    }
  }
  return values
}
