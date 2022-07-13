import {EditorMode} from '@app/editor/plugin-utils'
import {findPath} from '@app/editor/utils'
import {useFile, useFileEditor} from '@app/file-provider'
import {css} from '@app/stitches.config'
import {Box} from '@components/box'
import {Text, TextProps} from '@components/text'
import type {StaticParagraph as StaticParagraphType} from '@mintter/mttast'
import {isHeading, isStaticParagraph} from '@mintter/mttast'
import {useActor} from '@xstate/react'
import {Editor} from 'slate'
import type {RenderElementProps} from 'slate-react'
import {useHover, useHoverActiveSelector} from '../hover-context'
import type {EditorPlugin} from '../types'

export const ELEMENT_STATIC_PARAGRAPH = 'staticParagraph'

export const staticParagraphStyles = css({
  fontWeight: '$medium',
  marginTop: '.5em',
  userSelect: 'text',
})

const headingMap: {
  [key: number | string]: Pick<TextProps, 'size'> & {
    as: 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'
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
  10: {
    as: 'h6',
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
  var editor = useFileEditor()
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
  let fileRef = useFile()
  let [fileState] = useActor(fileRef)

  let editor = useFileEditor()

  var heading = useHeading(element as StaticParagraphType)
  var sizeProps = headingMap[heading?.level ?? 'default']
  var hoverService = useHover()
  let isHoverActive = useHoverActiveSelector()

  return (
    <Text
      data-element-type={element.type}
      className={staticParagraphStyles()}
      size="4"
      css={{
        lineHeight: '$3',
        paddingLeft: `${heading?.level * 16}px`,
        display: mode == EditorMode.Embed ? 'inline-block' : 'inherit',
        userSelect: 'none',
        backgroundColor: 'transparent',
        [`[data-hover-block="${heading?.node.id}"] &`]: {
          backgroundColor:
            editor.mode != EditorMode.Draft
              ? '$primary-component-bg-normal'
              : isHoverActive
              ? '$primary-component-bg-normal'
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
      <Box
        as="span"
        css={{
          userSelect: 'text',
          display: 'inline-block',
          width: '$full',
          maxWidth: '$prose-width',
        }}
      >
        {children}
      </Box>
    </Text>
  )
}
