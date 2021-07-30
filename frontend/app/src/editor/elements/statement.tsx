import {Path, Transforms} from 'slate'
import type {EditorPlugin} from '../types'
import {Editor, Element} from 'slate'
import {isFlowContent} from '@mintter/mttast'
import {isCollapsed, createStatement} from '../utils'
import {styled} from '@mintter/ui/stitches.config'
import {Box} from '@mintter/ui/box'

export const ELEMENT_STATEMENT = 'statement'

const DragHandle = styled(Box, {
  backgroundColor: '$background-muted',
  position: 'absolute',
  left: 0,
  top: 0,
  transform: 'translateX(-100%)',
  width: 24,
  height: 36,
  flex: 'none',
  // backgroundColor: 'red',
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
  gap: '$3',
  // flexDirection: 'column',
})

export const createStatementPlugin = (): EditorPlugin => ({
  name: ELEMENT_STATEMENT,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_STATEMENT) {
      return (
        <>
          <Statement {...attributes}>
            <DragHandle contentEditable={false} />
            <Box css={{flex: 1}}>{children}</Box>
          </Statement>
        </>
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
            Transforms.insertNodes(editor, createStatement() as Element, {at: Path.next(sPath)})
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
