import type {StaticParagraph as StaticParagraphType} from '@mintter/mttast'
import {isHeading, isStaticParagraph} from '@mintter/mttast'
import {createId, paragraph, statement, text} from '@mintter/mttast-builder'
import type {TextProps} from '@mintter/ui/text'
import {useActor} from '@xstate/react'
import {Editor, Node, Path, Transforms} from 'slate'
import type {RenderElementProps} from 'slate-react'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {useHover} from '../hover-context'
import {ELEMENT_PARAGRAPH} from '../paragraph'
import type {EditorPlugin} from '../types'
import {isCollapsed} from '../utils'
import {StaticParagraphUI} from './static-paragraph-ui'

export const ELEMENT_STATIC_PARAGRAPH = 'staticParagraph'

const headingMap: {
  [key: number | string]: Pick<TextProps, 'size'> & {
    as: 'h2' | 'h3' | 'h4' | 'h5' | 'p'
  }
} = {
  2: {
    as: 'h2',
    size: 8,
  },
  4: {
    as: 'h3',
    size: 7,
  },
  6: {
    as: 'h4',
    size: 6,
  },
  8: {
    as: 'h5',
    size: 5,
  },
  default: {
    as: 'p',
    size: 4,
  },
}

export const createStaticParagraphPlugin = (): EditorPlugin => ({
  name: ELEMENT_STATIC_PARAGRAPH,
  renderElement:
    () =>
    ({element, children, attributes}) => {
      if (isStaticParagraph(element)) {
        return (
          <StaticParagraph element={element} attributes={attributes}>
            {children}
          </StaticParagraph>
        )
      }
    },
  /*
   * @todo Demo TODO
   * @body this is an example TODO from a PR
   */
  configureEditor: (editor) => {
    if (editor.readOnly) return
    const {normalizeNode, insertBreak} = editor

    editor.insertBreak = () => {
      const {selection} = editor

      if (selection && isCollapsed(selection)) {
        const element = Editor.above(editor, {
          match: isStaticParagraph,
        })

        if (element) {
          const [, path] = element
          if (Editor.isStart(editor, selection.anchor, path)) {
            console.log('is Start!')
            Editor.withoutNormalizing(editor, () => {
              Transforms.insertNodes(editor, statement({id: createId()}, [paragraph([text('')])]), {
                at: Path.parent(path),
              })
              Transforms.select(editor, Path.next(Path.parent(path)).concat(0))
              Transforms.collapse(editor, {edge: 'start'})
            })

            return
          }
        }
      }
      insertBreak()
    }

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (isStaticParagraph(node)) {
        const parent = Node.parent(editor, path)

        if (!isHeading(parent)) {
          Transforms.setNodes(editor, {type: ELEMENT_PARAGRAPH}, {at: path})
          return
        }

        if (Path.hasPrevious(path)) {
          Editor.withoutNormalizing(editor, () => {
            // we are here because we created a new static-paragraph element as a second chid of the heading. what we want is to create a new statement as a child of this heading. we also need to check if there's already a group child on this statement to know if we need to add an extra group or not.
            Transforms.setNodes(editor, {type: ELEMENT_PARAGRAPH}, {at: path})
            const id = createId()
            Transforms.wrapNodes(editor, statement({id}), {
              at: path,
            })
            Transforms.setNodes(editor, {id}, {at: path})
          })
          return
        }
      }

      normalizeNode(entry)
    }
    return editor
  },
})

function useHeading(element: StaticParagraphType) {
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)
  const parent = Editor.parent(editor, path)
  if (parent) {
    const [node, path] = parent
    if (isHeading(node)) {
      return {
        node,
        level: path.length,
      }
    }
  }
}

function StaticParagraph({children, element, attributes}: RenderElementProps) {
  const heading = useHeading(element as StaticParagraphType)
  const sizeProps = headingMap[heading?.level ?? 'default']
  const hoverService = useHover()
  const [, hoverSend] = useActor(hoverService)

  return (
    <StaticParagraphUI
      data-element-type={element.type}
      {...sizeProps}
      {...attributes}
      onMouseEnter={() => {
        if (heading?.node) {
          hoverSend({type: 'MOUSE_ENTER', blockId: heading.node.id})
        }
      }}
    >
      {children}
    </StaticParagraphUI>
  )
}
