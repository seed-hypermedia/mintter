import {Path, Transforms} from 'slate'
import type {EditorPlugin} from '../types'
import {Editor, Element} from 'slate'
import {isFlowContent} from '@mintter/mttast'
import {isCollapsed, createStatement} from '../utils'
import {styled} from '@mintter/ui/stitches.config'
import {Box} from '@mintter/ui/box'
import {createId, statement} from '@mintter/mttast-builder'
import {Icon} from '@mintter/ui/icon'
import {Marker} from '../marker'

export const ELEMENT_STATEMENT = 'statement'

export const Tools = styled('div', {
  // width: 48,
  height: '$space$8',
  overflow: 'hidden',
  marginLeft: '-$7',
  flex: 'none',
  display: 'flex',
})
const Statement = styled('li', {
  marginTop: '$3',
  padding: 0,
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-start',
  listStyle: 'none',
})

export const Dragger = styled('div', {
  // backgroundColor: 'red',
  width: '$space$7',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 32,
  borderRadius: '$2',
  opacity: 0,
  transition: 'all ease-in-out 0.1s',
  '&:hover': {
    backgroundColor: '$background-muted',
    opacity: 1,
    cursor: 'grab',
  },
})

export const createStatementPlugin = (): EditorPlugin => ({
  name: ELEMENT_STATEMENT,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_STATEMENT) {
      return (
        <Statement {...attributes}>
          <Tools contentEditable={false}>
            <Dragger data-dragger>
              <Icon name="Grid6" size="2" color="muted" />
            </Dragger>
            <Marker element={element} />
          </Tools>
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
