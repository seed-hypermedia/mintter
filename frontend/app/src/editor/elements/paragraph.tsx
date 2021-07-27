import {SlatePlugin} from '../types'

export const ELEMENT_PARAGRAPH = 'paragraph'

export const createParagraphPlugin = (): SlatePlugin => ({
  key: ELEMENT_PARAGRAPH,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_PARAGRAPH) {
      return <p {...attributes}>{children}</p>
    }
  },
})
