import {Path, Transforms} from 'slate'
import type {EditorPlugin} from 'mixtape'
import {Editor} from 'slate'
import {isFlowContent, isCollapsed, createStatement} from '../utils'
import {styled} from '@mintter/ui/stitches.config'

export const ELEMENT_STATEMENT = 'statement'

const Statement = styled('li', {
  padding: 0,
})

export const createStatementPlugin = (): EditorPlugin => ({
  name: ELEMENT_STATEMENT,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_STATEMENT) {
      return (
        <Statement {...attributes}>
          <div contentEditable={false} />
          {children}
        </Statement>
      )
    }
  },
  configureEditor(editor) {
    const {insertBreak} = editor

    editor.insertBreak = () => {
      const {selection} = editor
      if (isCollapsed(selection)) {
        const parentStatement = Editor.above(editor, {
          match: (n) => isFlowContent(n),
        })
        if (parentStatement) {
          const [sNode, sPath] = parentStatement
          Editor.withoutNormalizing(editor, () => {
            Transforms.insertNodes(editor, createStatement(), {at: Path.next(sPath)})
            Transforms.select(editor, Path.next(sPath))
          })
          return
        }
      } else {
        insertBreak()
      }
    }

    return editor
  },
})
