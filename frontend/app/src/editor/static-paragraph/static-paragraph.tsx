import {EditorMode} from '@app/editor/plugin-utils'
import {findPath} from '@app/editor/utils'
import {css} from '@app/stitches.config'
import {Text, TextProps} from '@components/text'
import type {StaticParagraph as StaticParagraphType} from '@mintter/mttast'
import {isHeading, isStaticParagraph} from '@mintter/mttast'
import {useActor} from '@xstate/react'
import {Editor} from 'slate'
import type {RenderElementProps} from 'slate-react'
import {useSlateStatic} from 'slate-react'
import {useHover} from '../hover-context'
import type {EditorPlugin} from '../types'

export const ELEMENT_STATIC_PARAGRAPH = 'staticParagraph'

export const staticParagraphStyles = css({
  // fontWeight: '$bold',
  // marginTop: '1.5em',
  userSelect: 'text',
})

const headingMap: {
  [key: number | string]: Pick<TextProps, 'size'> & {
    as: 'h2' | 'h3' | 'h4' | 'h5' | 'p'
  }
} = {
  2: {
    as: 'h2',
  },
  4: {
    as: 'h3',
  },
  6: {
    as: 'h4',
  },
  8: {
    as: 'h5',
  },
  default: {
    as: 'p',
  },
}

export const createStaticParagraphPlugin = (): EditorPlugin => ({
  name: ELEMENT_STATIC_PARAGRAPH,
  renderElement:
    (editor) =>
    ({element, children, attributes}) => {
      if (isStaticParagraph(element)) {
        return (
          <StaticParagraph
            mode={editor.mode}
            element={element}
            attributes={attributes}
          >
            {children}
          </StaticParagraph>
        )
      }
    },
})

function useHeading(element: StaticParagraphType) {
  var editor = useSlateStatic()
  var path = findPath(element)
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

function StaticParagraph({
  children,
  element,
  attributes,
  mode,
}: RenderElementProps & {mode: EditorMode}) {
  var heading = useHeading(element as StaticParagraphType)
  var sizeProps = headingMap[heading?.level ?? 'default']
  var hoverService = useHover()
  let [hoverState] = useActor(hoverService)

  return (
    <Text
      data-element-type={element.type}
      className={staticParagraphStyles()}
      size="4"
      css={{
        display: mode == EditorMode.Embed ? 'inline-block' : 'inherit',
        userSelect: 'text',
        backgroundColor: 'transparent',
        [`[data-hover-block="${heading?.node.id}"] &`]: {
          backgroundColor: hoverState.matches('active')
            ? '$primary-component-bg-active'
            : 'transparent',
        },
      }}
      {...sizeProps}
      {...attributes}
      onMouseEnter={() => {
        if (heading?.node) {
          hoverService.send({type: 'MOUSE_ENTER', blockId: heading.node.id})
        }
      }}
    >
      {children}
    </Text>
  )
}
