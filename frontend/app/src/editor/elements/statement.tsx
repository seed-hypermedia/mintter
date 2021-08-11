import {BaseEditor, BaseSelection, NodeEntry, Path, Transforms} from 'slate'
import type {EditorPlugin} from '../types'
import {Editor, Element} from 'slate'
import {isFlowContent, Statement as StatementType} from '@mintter/mttast'
import {
  isCollapsed,
  createStatement,
  isRangeStart,
  isRangeEnd,
  getParentFlowContent,
  MTTEditor,
  isRangeMiddle,
} from '../utils'
import {styled} from '@mintter/ui/stitches.config'
import {Box} from '@mintter/ui/box'
import {createId, statement} from '@mintter/mttast-builder'
import {Icon} from '@mintter/ui/icon'
import {Marker} from '../marker'
import {Range} from 'slate'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {cond} from 'ramda'
import {useEffect} from 'react'

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
    // TODO: create a hook to get all the embeds from its content to rendered as annotations. this should be used to all FlowContent nodes
    // const editor = useSlateStatic()
    // const currentPath = ReactEditor.findPath(editor, element)
    // const [parent, parentPath] = Editor.parent(editor, currentPath)
    // useEffect(() => {
    //   console.log('parent new childs!', element, parent)
    // }, [parent.children.length])
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
      const {selection} = editor

      const statement: NodeEntry<StatementType> = getParentFlowContent(editor)({type: ELEMENT_STATEMENT})
      if (statement) {
        const [node, path] = statement
        // cond([
        //   [isRangeStart(editor), handleEnterAtStartOfStatement(editor)],
        //   [isRangeEnd(editor), handleEnterAtEndOfStatement(editor)],
        //   [isRangeMiddle(editor), handleEnterAtMiddleOfStatement(editor)],
        //   [() => insertBreak()],
        // ])(statement)

        const isStart = isRangeStart(editor)([...path, 0])
        const isEnd = isRangeEnd(editor)([...path, 0])
        const isMiddle = !isStart && !isEnd

        console.log('statement', {isStart, isEnd, isMiddle})

        if (isStart) return handleEnterAtStartOfStatement(editor)(statement)
        if (isEnd) return handleEnterAtEndOfStatement(editor)(statement)
        if (isMiddle) return handleEnterAtMiddleOfStatement(editor)(statement)
      }

      insertBreak()
    }

    return editor
  },
})

const handleEnterAtStartOfStatement = (editor: MTTEditor) => (nodeEntry: NodeEntry<StatementType>) => {
  // create statement at same path. same as Heading plugin!
  console.log('enter at START of statement')
  const [node, path] = nodeEntry

  Editor.withoutNormalizing(editor, () => {
    Transforms.insertNodes(editor, createStatement() as Element, {at: path})
    Transforms.select(editor, Editor.start(editor, Editor.start(editor, Path.next(path))))
  })
}

const handleEnterAtEndOfStatement = (editor: MTTEditor) => (nodeEntry: NodeEntry<StatementType>) => {
  // create new statement at next path
  console.log('enter at END of statement', nodeEntry)
  const [node, path] = nodeEntry
  const hasChildrenGrouping = node.children.length == 2
  console.log(
    '🚀 ~ file: statement.tsx ~ line 127 ~ handleEnterAtEndOfStatement ~ hasChildrenGrouping',
    hasChildrenGrouping,
  )
  let targetPath = Path.next(path)
  Editor.withoutNormalizing(editor, () => {
    if (hasChildrenGrouping) {
      // add new statement as the first child of child group
      targetPath = [...path, 1, 0]
      Transforms.insertNodes(editor, createStatement() as Element, {at: targetPath})
      Transforms.select(editor, targetPath)
    } else {
      Transforms.insertNodes(editor, createStatement() as Element, {at: targetPath})
      Transforms.select(editor, targetPath)
    }
  })
}

const handleEnterAtMiddleOfStatement = (editor: MTTEditor) => (nodeEntry: NodeEntry<StatementType>) => {
  // if selection is in the middle, split paragraph and create statement at next path
  console.log('enter at MIDDLE of statement')
  const [node, path] = nodeEntry
  const hasChildrenGrouping = node.children.length == 2
  let targetPath = Path.next(path)

  Editor.withoutNormalizing(editor, () => {
    Transforms.splitNodes(editor)
    Transforms.wrapNodes(editor, statement([]))
    const newParagraphPath = [...path, 1]
    if (hasChildrenGrouping) {
      targetPath = [...path, 2, 0]
      Transforms.moveNodes(editor, {at: newParagraphPath, to: targetPath})
      Transforms.select(editor, Editor.start(editor, [...path, 1, 0]))
    } else {
      Transforms.moveNodes(editor, {at: newParagraphPath, to: targetPath})
    }
  })
}
