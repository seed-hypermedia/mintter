import {useDrag} from '@app/drag-context'
import {usePhrasingProps} from '@app/editor/editor-node-props'
import {EditorMode} from '@app/editor/plugin-utils'
import {headingMap} from '@app/editor/utils'
import {useBlockObserve, useMouse} from '@app/mouse-context'
import {mergeRefs} from '@app/utils/mege-refs'
import {
  isStaticParagraph,
  StaticParagraph as StaticParagraphType,
} from '@mintter/shared'
import {SizableText, SizeTokens} from '@mintter/ui'
import {MouseEvent, useMemo, useRef} from 'react'
import {Path} from 'slate'
import {RenderElementProps, useSlate} from 'slate-react'
import type {EditorPlugin} from '../types'

export const ELEMENT_STATIC_PARAGRAPH = 'staticParagraph'

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
  let editor = useSlate()
  let dragService = useDrag()
  let {elementProps, parentPath} = usePhrasingProps(editor, element)

  let paddingLeft = useMemo(
    () => (elementProps['data-parent-group'] == 'group' ? '$2' : 0),
    [elementProps],
  )

  let pRef = useRef<HTMLElement | undefined>()
  let otherProps = {
    ref: mergeRefs([attributes.ref, pRef]),
  }
  useBlockObserve(mode, pRef)

  let dragProps = {
    onMouseOver: (e: MouseEvent) => {
      if (Path.isPath(parentPath)) {
        dragService?.send({
          type: 'DRAG.OVER',
          toPath: parentPath,
          element: null,
          currentPosX: e.clientX,
          currentPosY: e.clientY,
        })
      }
    },
  }

  let elementTags = useMemo(() => {
    let defaultValue = {tag: 'p', size: 16, height: 24}
    if (parentPath) {
      return headingMap[parentPath.length] || defaultValue
    }

    return defaultValue
  }, [parentPath])

  if (mode == EditorMode.Embed) {
    return (
      <SizableText
        size="$5"
        selectionColor="$color10"
        tag="span"
        color="$color9"
        fontWeight="600"
        padding="$1"
        {...attributes}
        {...otherProps}
      >
        {children}
      </SizableText>
    )
  }

  return (
    <SizableText
      tag={elementTags.tag}
      size={elementTags.size}
      fontWeight="700"
      // paddingLeft={paddingLeft}
      alignItems="center"
      // size="$5"
      {...attributes}
      {...elementProps}
      {...otherProps}
      {...dragProps}
    >
      {children}
    </SizableText>
  )
}
