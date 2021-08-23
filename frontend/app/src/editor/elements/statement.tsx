import {Path, Transforms} from 'slate'
import type {EditorPlugin} from '../types'
import {Editor, Element} from 'slate'
import {GroupingContent, isGroupContent, Statement as StatementType} from '@mintter/mttast'
import {isCollapsed, unhangRange, isLastChild, getLastChild} from '../utils'
import type {MTTEditor} from '../utils'
import {styled} from '@mintter/ui/stitches.config'
import {group} from '@mintter/mttast-builder'
import {Icon} from '@mintter/ui/icon'
import {Marker} from '../marker'
import {ELEMENT_HEADING} from './heading'

export const ELEMENT_STATEMENT = 'statement'

export const Tools = styled('div', {
  height: '$space$8',
  overflow: 'hidden',
  alignSelf: 'center',
  display: 'flex',
  alignItems: 'center',
})
const Statement = styled('li', {
  marginTop: '$3',
  padding: 0,
  listStyle: 'none',
  display: 'grid',
  gridTemplateColumns: 'minmax($space$8, auto) 1fr',
  gridTemplateRows: 'min-content auto',
  gap: '0 $2',
  gridTemplateAreas: `"controls content"
  ". children"`,
  [`& > ${Tools}`]: {
    gridArea: 'controls',
  },
  "& > [data-element-type='paragraph']": {
    gridArea: 'content',
  },
  '& > ul, & > ol': {
    gridArea: 'children',
  },
})

export const Dragger = styled('div', {
  // backgroundColor: 'red',
  width: '$space$8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 32,
  borderRadius: '$2',
  opacity: 0,
  transition: 'all ease-in-out 0.1s',
  '&:hover': {
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

          {children}
        </Statement>
      )
    }
  },
  configureEditor(editor) {
    const {normalizeNode} = editor

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (node.type == ELEMENT_STATEMENT) {
        // check if there's a group below, if so, move inside that group
        const parent = Editor.parent(editor, path)

        if (!isLastChild(parent, path)) {
          const lastChild = getLastChild(parent)
          if (isGroupContent(lastChild[0])) {
            // the last child of the statement is a group. we should move the new as the first child
            console.log('move node!')
            Transforms.moveNodes(editor, {at: path, to: lastChild[1].concat(0)})
            return
          }
        }

        const [parentNode, parentPath] = parent
        if (parentNode.type == ELEMENT_STATEMENT) {
          // if parent is a statement and is the last child (because the previous if is false) then we can move the new statement to the next position of it's parent
          Transforms.moveNodes(editor, {at: path, to: Path.next(parentPath)})
          return
        }
        if (parentNode.type == ELEMENT_HEADING) {
          // this statement should be part of a group inside the heading, we need to wrap it!
          Transforms.wrapNodes(editor, group([]), {at: path})
          return
        }
      }
      normalizeNode(entry)
    }

    return editor
  },
})
