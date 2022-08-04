import {useBlockTools} from '@app/editor/block-tools-context'
import {usePhrasingProps} from '@app/editor/editor-node-props'
import {EditorMode} from '@app/editor/plugin-utils'
import {phrasingStyles} from '@app/editor/styles'
import {css} from '@app/stitches.config'
import {Text} from '@components/text'
import {isStaticParagraph} from '@mintter/mttast'
import {useEffect, useMemo} from 'react'
import type {RenderElementProps} from 'slate-react'
import type {EditorPlugin} from '../types'

export const ELEMENT_STATIC_PARAGRAPH = 'staticParagraph'

export const staticphrasingStyles = css({
  fontWeight: '$medium',
  marginTop: '.5em',
  // userSelect: 'text',
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
  let {elementProps, parentPath} = usePhrasingProps(element)
  let btService = useBlockTools()
  let as = useMemo(
    () => headingMap[parentPath?.length ?? 'default'],
    [parentPath],
  )

  useEffect(() => {
    if (attributes.ref.current) {
      btService.send({type: 'ENTRY.OBSERVE', entry: attributes.ref.current})
    }
  }, [attributes.ref.current])

  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return <span {...elementProps}>{children}</span>
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
    >
      {children}
    </Text>
  )
}
