import {styled} from '@mintter/ui/stitches.config'
import type {EditorPlugin} from '../types'
import {Text} from '@mintter/ui/text'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {Editor, Node, Path, Transforms} from 'slate'
import type {NodeEntry} from 'slate'
import type {Heading} from '@mintter/mttast'
import {ELEMENT_HEADING} from './heading'
import {ELEMENT_PARAGRAPH} from './paragraph'
import {createId, statement} from '@mintter/mttast-builder'

export const ELEMENT_STATIC_PARAGRAPH = 'staticParagraph'

const StaticParagraph = styled(Text, {
  fontWeight: '$bold',
})

const headingMap = {
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
  renderElement({attributes, children, element}) {
    const editor = useSlateStatic()
    const level = useHeadingLevel(element)
    if (element.type === ELEMENT_STATIC_PARAGRAPH) {
      const sizeProps = headingMap[level ?? 'default']
      return (
        <StaticParagraph
          {...sizeProps}
          data-element-type={element.type}
          css={{fontWeight: level ? '$bold' : '$regular', lineHeight: 2}}
          {...attributes}
        >
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
    const {normalizeNode} = editor

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (node.type == ELEMENT_STATIC_PARAGRAPH) {
        const parent = Node.parent(editor, path)

        if (parent.type != ELEMENT_HEADING) {
          Transforms.setNodes(editor, {type: ELEMENT_PARAGRAPH}, {at: path})
          return
        }

        if (Path.hasPrevious(path)) {
          Editor.withoutNormalizing(editor, () => {
            // we are here because we created a new static-paragraph element as a second chid of the heading. what we want is to create a new statement as a child of this heading. we also need to check if there's already a group child on this statement to know if we need to add an extra group or not.
            Transforms.setNodes(editor, {type: ELEMENT_PARAGRAPH}, {at: path})
            Transforms.wrapNodes(editor, statement({id: createId()}, []), {
              at: path,
            })
          })
          return
        }
      }

      normalizeNode(entry)
    }
    return editor
  },
})

function useHeadingLevel(element) {
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)
  const parent: NodeEntry<Heading> = Editor.parent(editor, path)
  if (parent) {
    const [node, path] = parent
    if (node.type == ELEMENT_HEADING) {
      return path.length
    }
  }
}
