import {SlatePlugin} from '../types'

export const ELEMENT_GROUP = 'group'

export const createGroupPlugin = (): SlatePlugin => ({
  key: ELEMENT_GROUP,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_GROUP) {
      return <ul {...attributes}>{children}</ul>
    }
  },
})
