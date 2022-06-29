import {EditorMode} from '@app/editor/plugin-utils'
import {styled} from '@app/stitches.config'
import {isUnorderedList} from '@mintter/mttast'
import {forwardRef} from 'react'
import {GroupProps, groupStyle} from '../group'
import type {EditorPlugin} from '../types'
import {resetGroupingContent} from '../utils'

export const ELEMENT_UNORDERED_LIST = 'unorderedList'

export const StyledUl = styled('ul', groupStyle)

export const createUnorderedListPlugin = (): EditorPlugin => ({
  name: ELEMENT_UNORDERED_LIST,
  renderElement:
    (editor) =>
    ({attributes, children, element}) => {
      if (isUnorderedList(element)) {
        return (
          <UnorderedList
            mode={editor.mode}
            element={element}
            attributes={attributes}
          >
            {children}
          </UnorderedList>
        )
      }
    },
  configureEditor(editor) {
    if (editor.readOnly) return
    const {deleteBackward} = editor

    editor.deleteBackward = (unit) => {
      if (resetGroupingContent(editor)) return
      deleteBackward(unit)
    }

    return editor
  },
})

const UnorderedList = forwardRef<GroupProps, any>(
  ({mode, attributes, element, ...props}, ref) => {
    if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
      return null
    }

    return (
      <StyledUl
        {...attributes}
        ref={ref}
        data-element-type={element.type}
        {...props}
      />
    )
  },
)
