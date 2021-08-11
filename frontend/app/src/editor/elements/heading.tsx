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
  marginTop: '$7',
  padding: 0,
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-start',
  listStyle: 'none',
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
          <Box
            css={{
              flex: 1,
              '& > p': {
                fontWeight: '$bold',
              },
            }}
          >
            {children}
          </Box>
        </Heading>
      )
    }
  },
  configureEditor: (editor) => {
    /**
     * TODO: override insertBreak
     * - if Start: ???
     * - if End:
     *  - create a group
     *  - create a statement
     *  - select child statement
     * - if Middle:
     *  - break static paragraph
     *  - move text into new paragraph
     *  - wrap paragraph in a statement
     *  - wrap statement in a group (should be in the correct position: second child of heading)
     *
     */
    const {insertBreak} = editor
    editor.insertBreak = () => {
      const {selection} = editor
      const headingNode: NodeEntry<Heading> = getParentFlowContent(editor)({type: ELEMENT_HEADING})

      if (headingNode) {
        const [node, path] = headingNode
        // cond([
        //   [isRangeStart(editor), handleEnterAtStartOfHeading(editor)],
        //   [isRangeEnd(editor), handleEnterAtEndOfHeading(editor)],
        //   [isRangeMiddle(editor), handleEnterAtMiddleOfHeading(editor)],
        //   [() => insertBreak()],
        // ])(statement)

        const isStart = isRangeStart(editor)([...path, 0])
        const isEnd = isRangeEnd(editor)([...path, 0])
        const isMiddle = !isStart && !isEnd

        console.log('heading', {isStart, isEnd, isMiddle})

        if (isStart) return handleEnterAtStartOfHeading(editor)(headingNode)
        if (isEnd) return handleEnterAtEndOfHeading(editor)(headingNode)
        if (isMiddle) return handleEnterAtMiddleOfHeading(editor)(headingNode)
      }

      insertBreak()
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
  let targetPath = []
}
