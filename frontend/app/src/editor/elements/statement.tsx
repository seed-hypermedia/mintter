import {SlatePlugin} from '../types'

export const ELEMENT_STATEMENT = 'statement'

export const createStatementPlugin = (): SlatePlugin => ({
  key: ELEMENT_STATEMENT,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_STATEMENT) {
      return <li {...attributes}>{children}</li>
    }
  },
})
