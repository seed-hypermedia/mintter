import {Path, Transforms} from 'slate'
import type {EditorPlugin} from 'mixtape'
import {Editor} from 'slate'
import {isFlowContent, isCollapsed, createStatement} from '../utils'
import {styled} from '@mintter/ui/stitches.config'
import {Box} from '@mintter/ui/box'

export const ELEMENT_STATEMENT = 'statement'

const DragHandle = styled(Box, {
  backgroundColor: '$background-muted',
  width: 24,
  height: 36,
  flex: 'none',
  opacity: 0,
  '&:hover': {
    cursor: 'pointer',
    opacity: 1,
  },
})

const Statement = styled('li', {
  padding: 0,
  position: 'relative',
  display: 'flex',
  // flexDirection: 'column',
})

export const createStatementPlugin = (): EditorPlugin => ({
  name: ELEMENT_STATEMENT,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_STATEMENT) {
      return (
        <Statement {...attributes}>
          <DragHandle contentEditable={false} />
          <Box css={{flex: 1}}>{children}</Box>
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
