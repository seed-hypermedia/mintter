import {useBlockTools} from '@app/editor/block-tools-context'
import {usePhrasingProps} from '@app/editor/editor-node-props'
import {useHover} from '@app/editor/hover-context'
import {EditorMode} from '@app/editor/plugin-utils'
import {hoverStyles, phrasingStyles} from '@app/editor/styles'
import {useFileIds} from '@app/file-provider'
import {useIsEditing} from '@app/main-context'
import {
  isStaticParagraph,
  StaticParagraph as StaticParagraphType,
} from '@app/mttast'
import {css} from '@app/stitches.config'
import {Box} from '@components/box'
import {Text} from '@components/text'
import {useEffect, useMemo} from 'react'
import type {RenderElementProps} from 'slate-react'
import type {EditorPlugin} from '../types'

export const ELEMENT_STATIC_PARAGRAPH = 'staticParagraph'

export const staticphrasingStyles = css({
  fontWeight: '$medium',
  marginTop: '.5em',
})

const headingMap = {
  2: 'h2',
  4: 'h3',
  6: 'h4',
  8: 'h5',
  10: 'h6',
  default: 'p',
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

function StaticParagraph({
  children,
  element,
  attributes,
  mode,
}: RenderElementProps & {mode: EditorMode; element: StaticParagraphType}) {
  let {elementProps, parentNode, parentPath} = usePhrasingProps(element)
  let btService = useBlockTools()
  let isEditing = useIsEditing()

  let as = useMemo(
    () => headingMap[parentPath?.length ?? 'default'],
    [parentPath],
  )

  let hoverService = useHover()
  let [docId] = useFileIds()

  useEffect(() => {
    if (attributes.ref.current) {
      btService.send({type: 'ENTRY.OBSERVE', entry: attributes.ref.current})
    }
  }, [attributes.ref, btService])

  let hoverProps = {
    css: !isEditing ? hoverStyles(`${docId}/${parentNode?.id}`) : undefined,
    onMouseEnter: () => {
      hoverService.send({
        type: 'MOUSE_ENTER',
        ref: `${docId}/${parentNode?.id}`,
      })
    },
    // onMouseLeave: () => {
    //   hoverService.send({
    //     type: 'MOUSE_LEAVE',
    //     ref: `${docId}/${parentNode?.id}`,
    //   })
    // },
  }

  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return (
      <Box
        as="span"
        {...attributes}
        // {...elementProps}
        css={{
          [`[data-hover-ref="${docId}/${parentNode?.id}"] &:before`]: {
            backgroundColor: '$primary-component-bg-normal',
            opacity: 1,
          },
        }}
      >
        {children}
      </Box>
    )
  }

  return (
    <Text
      as={as}
      {...attributes}
      {...elementProps}
      className={phrasingStyles({
        type: 'staticParagraph',
        blockType: 'heading',
      })}
      {...hoverProps}
    >
      {children}
    </Text>
  )
}
