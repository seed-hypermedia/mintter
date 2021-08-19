import {styled} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {Icon} from '@mintter/ui/icon'
import type {EditorPlugin} from '../types'
import {Dragger, Tools} from './statement'
import {Box} from '@mintter/ui/box'
import {Marker} from '../marker'
import {Ancestor, BaseEditor, BaseSelection, NodeEntry, Transforms} from 'slate'
import {Editor, Path} from 'slate'
import {Blockquote, Heading as HeadingType, isFlowContent, Parent, Statement} from '@mintter/mttast'
import type {ReactEditor} from 'slate-react'
import {
  createStatement,
  getParentFlowContent,
  isCollapsed,
  isRangeEnd,
  isRangeMiddle,
  isRangeStart,
  MTTEditor,
} from '../utils'
import {group, paragraph, statement, text} from 'frontend/mttast-builder/dist'
import {ELEMENT_PARAGRAPH} from './paragraph'

export const ELEMENT_HEADING = 'heading'

export const Heading = styled('li', {
  marginTop: '$3',
  display: 'grid',
  gridTemplateColumns: '$space$8 1fr',
  gridTemplateRows: 'auto auto',
  gap: '0 $2',
  gridTemplateAreas: `"controls content"
  ". children"`,
  [`& > ${Tools}`]: {
    gridArea: 'controls',
  },

  "& > [data-element-type='staticParagraph']": {
    gridArea: 'content',
  },
  '& > ul, & > ol': {
    gridArea: 'children',
  },
})

export const createHeadingPlugin = (): EditorPlugin => ({
  name: ELEMENT_HEADING,
  renderElement({attributes, children, element}) {
    // TODO: compute heading level
    if (element.type === ELEMENT_HEADING) {
      return (
        <Heading {...attributes}>
          <Tools contentEditable={false}>
            <Dragger>
              <Icon name="Grid6" size="2" color="muted" />
            </Dragger>
            <Marker element={element} />
          </Tools>
          {children}
        </Heading>
      )
    }
  },
  configureEditor: (editor) => {
    const {insertBreak, deleteBackward} = editor
    editor.insertBreak = () => {
      const {selection} = editor
      const headingNode: NodeEntry<Heading> = getParentFlowContent(editor)({type: ELEMENT_HEADING})
      console.log('🚀 ~ file: heading.tsx ~ line 81 ~ headingNode', headingNode)

      if (headingNode) {
        const [node, path] = headingNode

        const isStart = isRangeStart(editor)([...path, 0])
        const isEnd = isRangeEnd(editor)([...path, 0])
        const isMiddle = !isStart && !isEnd

        console.log('heading', {isStart, isEnd})

        if (isStart) return handleEnterAtStartOfHeading(editor)(headingNode)
        if (isEnd) return handleEnterAtEndOfHeading(editor)(headingNode)
        if (isMiddle) return handleEnterAtMiddleOfHeading(editor)(headingNode)
        return
      }

      insertBreak()
    }

    editor.deleteBackward = (unit) => {
      const {selection} = editor
      const headingNode: NodeEntry<HeadingType> = getParentFlowContent(editor)({type: ELEMENT_HEADING})
      console.log('🚀 ~ headingNode', headingNode)

      if (headingNode) {
        const [node, path] = headingNode

        const isStart = isRangeStart(editor)([...path, 0])

        if (isStart) {
          Transforms.unwrapNodes(editor, {at: path})
          if (node.children.length == 2) {
            Transforms.unwrapNodes(editor, {at: Path.next(path)})
          }
        }

        // if (isStart) return handleDeleteAtStartOfHeading(editor)(headingNode)
        // if (isEnd) return handleEnterAtEndOfHeading(editor)(headingNode)
        // return handleEnterAtMiddleOfHeading(editor)(headingNode)
        // return
      }

      deleteBackward(unit)
    }

    return editor
  },
})

const handleEnterAtStartOfHeading = (editor: MTTEditor) => (heading: NodeEntry<HeadingType>) => {
  console.log('Heading: AT Start')
  const [node, path] = heading

  // create statement at same path. the same as in the statement plugin!
  Editor.withoutNormalizing(editor, () => {
    Transforms.insertNodes(editor, createStatement(), {at: path})
    Transforms.select(editor, Editor.start(editor, Path.next(path)))
  })
}
const handleEnterAtEndOfHeading = (editor: MTTEditor) => (heading: NodeEntry<HeadingType>) => {
  console.log('Heading: AT End')
  const [node, path] = heading
  const hasChildrenGrouping = node.children.length == 2
  let targetPath = [...path, 1, 0]
  Editor.withoutNormalizing(editor, () => {
    if (hasChildrenGrouping) {
      // create a statement as first child of the current group
      Transforms.insertNodes(editor, createStatement(), {
        at: [...path, 1, 0],
      })
    } else {
      // create a new group below the current heading
      Transforms.insertNodes(editor, group([createStatement()]), {
        at: [...path, 1],
      })
    }
    Transforms.select(editor, [...path, 1, 0])
  })
}
const handleEnterAtMiddleOfHeading = (editor: MTTEditor) => (heading: NodeEntry<HeadingType>) => {
  console.log('Heading: AT Middle')
  const [node, path] = heading
  const hasChildrenGrouping = node.children.length == 2
  let targetPath = [...path, 1, 0]
  Editor.withoutNormalizing(editor, () => {
    Transforms.splitNodes(editor)
    Transforms.setNodes(editor, {type: ELEMENT_PARAGRAPH}, {at: [...path, 1]})
    Transforms.wrapNodes(editor, statement([]), {at: [...path, 1]})
    console.log(node)
    if (hasChildrenGrouping) {
      Transforms.moveNodes(editor, {at: [...path, 1], to: [...path, 2, 0]})
    } else {
      Transforms.wrapNodes(editor, group([]), {at: [...path, 1]})
    }
  })
}

const handleDeleteAtStartOfHeading = (editor: MTTEditor) => (heading: NodeEntry<HeadingType>) => {
  console.log('Heading: Delete at START')
  /**
   * - if
   */
}
