// import {toggleMark} from '../utils'
import {css} from '@app/stitches.config'
import type {EditorPlugin} from '../types'

export const MARK_CODE = 'code'

const codeStyles = css({
  padding: '3px 5px',
  borderRadius: '$2',
  backgroundColor: '$background-neutral',
  color: '$background-opposite',
  fontSize: '0.9em',
})

export const createInlineCodePlugin = (): EditorPlugin => ({
  name: MARK_CODE,
  renderLeaf:
    () =>
    ({attributes, children, leaf}) => {
      if (leaf[MARK_CODE] && leaf.value) {
        return (
          <code className={codeStyles()} {...attributes}>
            {children}
          </code>
        )
      }
    },
  // onDOMBeforeInput: (editor) => (ev) => {
  //   if (ev.inputType == 'formatItalic') {
  //     ev.preventDefault()
  //     toggleMark(editor, MARK_CODE)
  //   }
  // },
})
