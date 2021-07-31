import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'
import {Text} from '@mintter/ui/text'

export const ELEMENT_STATIC_PARAGRAPH = 'staticParagraph'

export const createStaticParagraphPlugin = (): EditorPlugin => ({
  name: ELEMENT_STATIC_PARAGRAPH,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_STATIC_PARAGRAPH) {
      return <span {...attributes}>{children}</span>
    }
  },
})
