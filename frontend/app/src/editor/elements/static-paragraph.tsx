import type {StaticParagraph as StaticParagraphType} from '@mintter/mttast'
import type {EditorPlugin} from '../types'
import type {TextProps} from '@mintter/ui/text'
import {styled} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {Editor, Node, Path, Transforms} from 'slate'
import {isHeading, isStaticParagraph} from '@mintter/mttast'
import {ELEMENT_PARAGRAPH} from './paragraph'
import {createId, statement} from '@mintter/mttast-builder'

export const ELEMENT_STATIC_PARAGRAPH = 'staticParagraph'

const StaticParagraph = styled(Text, {
  fontWeight: '$bold',
})

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
  renderElement({attributes, children, element}) {
    const level = useHeadingLevel(element as StaticParagraphType)
    if (isStaticParagraph(element)) {
      const sizeProps = headingMap[level ?? 'default']
      return (
        <StaticParagraph
          data-element-type={element.type}
          {...sizeProps}
          {...attributes}
          css={{
            marginTop: '1.5em',
            fontWeight: '$bold',
          }}
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
            let id = createId()
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

function useHeadingLevel(element: StaticParagraphType) {
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)
  const parent = Editor.parent(editor, path)
  if (parent) {
    const [node, path] = parent
    if (isHeading(node)) {
      return path.length
    }
  }
}
