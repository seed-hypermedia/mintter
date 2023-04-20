import {SizableText} from '@mintter/ui'
import type {EditorPlugin} from '../types'

export const MARK_CODE = 'code'

export const createInlineCodePlugin = (): EditorPlugin => ({
  name: MARK_CODE,
  renderLeaf:
    () =>
    ({attributes, children, leaf}) => {
      if (leaf[MARK_CODE] && leaf.text) {
        return (
          <SizableText
            tag="code"
            {...attributes}
            paddingHorizontal="$2"
            paddingVertical="$1"
            backgroundColor="$backgroundHover"
            color="$color"
            fontSize="0.9em"
          >
            {children}
          </SizableText>
        )
      }
    },
})
