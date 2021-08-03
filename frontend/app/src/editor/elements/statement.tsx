import {Path, Transforms} from 'slate'
import type {EditorPlugin} from '../types'
import {Editor, Element} from 'slate'
import {isFlowContent} from '@mintter/mttast'
import {isCollapsed, createStatement} from '../utils'
import {styled} from '@mintter/ui/stitches.config'
import {Box} from '@mintter/ui/box'
import {createId, statement} from '@mintter/mttast-builder'

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
  opacity: 0,
  '&:hover': {
    cursor: 'pointer',
    opacity: 1,
  },
})

const Statement = styled('li', {
  padding: 0,
  paddingLeft: '$5',
  position: 'relative',
  display: 'flex',
  gap: '$3',
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
      console.log('insertBreak: start')
      const {selection} = editor
      if (isCollapsed(selection)) {
        const parentStatement = Editor.above(editor, {
          match: (n) => isFlowContent(n),
        })
        if (parentStatement) {
          const [sNode, sPath] = parentStatement
          const isEnd = Editor.isEnd(editor, selection.focus, sPath)
          const isStart = Editor.isStart(editor, selection.focus, sPath)

          if (isStart) {
            // create statement at same path
            Editor.withoutNormalizing(editor, () => {
              Transforms.insertNodes(editor, createStatement() as Element, {at: sPath})
              Transforms.select(editor, Editor.start(editor, Editor.start(editor, Path.next(sPath))))
            })
            return
          }

          if (isEnd) {
            // create new statement at next path
            Editor.withoutNormalizing(editor, () => {
              Transforms.insertNodes(editor, createStatement() as Element, {at: Path.next(sPath)})
              Transforms.select(editor, Path.next(sPath))
            })
            return
          }

          // if selection is in the middle, split paragraph and create statement at next path
          Editor.withoutNormalizing(editor, () => {
            Transforms.splitNodes(editor)
            const newParagraphPath = [...sPath, 1]
            Transforms.wrapNodes(editor, statement({id: createId()}, []), {at: newParagraphPath})
            Transforms.moveNodes(editor, {at: newParagraphPath, to: Path.next(sPath)})
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
