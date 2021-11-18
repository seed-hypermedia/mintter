import type { StaticParagraph as StaticParagraphType } from '@mintter/mttast'
import { isHeading, isStaticParagraph } from '@mintter/mttast'
import type { TextProps } from '@mintter/ui/text'
import { useActor } from '@xstate/react'
import { Editor, NodeEntry } from 'slate'
import type { RenderElementProps } from 'slate-react'
import { ReactEditor, useSlateStatic } from 'slate-react'
import { useHover } from '../hover-context'
import type { EditorPlugin } from '../types'
import { StaticParagraphUI } from './static-paragraph-ui'

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
      ({ element, children, attributes }) => {
        if (isStaticParagraph(element)) {
          return (
            <StaticParagraph element={element} attributes={attributes}>
              {children}
            </StaticParagraph>
          )
        }
      },
})

function createParagraphOnEnter(
  editor: Editor,
  parent: NodeEntry<StaticParagraphType>,
  grandParent: NodeEntry<Heading>,
) {
  return function paragraphCreator() {
    let [pNode, pPath] = parent
    let [gpNode, gpPath] = grandParent

    let targetPath = [...gpPath, 1, 0]
  }
}

function useHeading(element: StaticParagraphType) {
  var editor = useSlateStatic()
  var path = ReactEditor.findPath(editor, element)
  var parent = Editor.parent(editor, path)
  if (parent) {
    let [node, path] = parent
    if (isHeading(node)) {
      console.log('heading: ', node, path)

      return {
        node,
        level: path.length,
      }
    }
  }
}

function StaticParagraph({ children, element, attributes }: RenderElementProps) {
  var heading = useHeading(element as StaticParagraphType)
  var sizeProps = headingMap[heading?.level ?? 'default']
  var hoverService = useHover()
  var [, hoverSend] = useActor(hoverService)

  return (
    <StaticParagraphUI
      data-element-type={element.type}
      {...sizeProps}
      {...attributes}
      onMouseEnter={() => {
        if (heading?.node) {
          hoverSend({ type: 'MOUSE_ENTER', blockId: heading.node.id })
        }
      }}
    >
      {children}
    </StaticParagraphUI>
  )
}
