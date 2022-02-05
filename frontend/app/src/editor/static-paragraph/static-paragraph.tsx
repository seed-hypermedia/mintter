import {hoverModel} from '@app/editor/hover-machine'
import {EditorMode} from '@app/editor/plugin-utils'
import type {TextProps} from '@components/text'
import type {StaticParagraph as StaticParagraphType} from '@mintter/mttast'
import {isHeading, isStaticParagraph} from '@mintter/mttast'
import {useActor} from '@xstate/react'
import {Editor} from 'slate'
import type {RenderElementProps} from 'slate-react'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {useHover} from '../hover-context'
import type {EditorPlugin} from '../types'
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
    (editor) =>
    ({element, children, attributes}) => {
      if (isStaticParagraph(element)) {
        return (
          <StaticParagraph mode={editor.mode} element={element} attributes={attributes}>
            {children}
          </StaticParagraph>
        )
      }
    },
})

function useHeading(element: StaticParagraphType) {
  var editor = useSlateStatic()
  var path = ReactEditor.findPath(editor, element)
  var parent = Editor.parent(editor, path)
  if (parent) {
    let [node, path] = parent
    if (isHeading(node)) {
      return {
        node,
        level: path.length,
      }
    }
  }
}

function StaticParagraph({children, element, attributes, mode}: RenderElementProps & {mode: EditorMode}) {
  var heading = useHeading(element as StaticParagraphType)
  var sizeProps = headingMap[heading?.level ?? 'default']
  var hoverService = useHover()
  var [, hoverSend] = useActor(hoverService)

  return (
    <StaticParagraphUI
      data-element-type={element.type}
      css={{
        display: mode == EditorMode.Embed ? 'inline' : 'inherit',
        // backgroundColor: hoverState.context.blockId == heading?.node.id ? '$secondary-muted' : 'transparent',
      }}
      {...sizeProps}
      {...attributes}
      onMouseEnter={() => {
        if (heading?.node) {
          hoverSend(hoverModel.events.MOUSE_ENTER(heading.node.id))
        }
      }}
    >
      {children}
    </StaticParagraphUI>
  )
}
