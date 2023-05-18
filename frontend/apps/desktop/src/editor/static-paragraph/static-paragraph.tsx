import {usePhrasingProps} from '@app/editor/editor-node-props'
import {EditorMode} from '@app/editor/plugin-utils'
import {headingMap} from '@app/editor/utils'
import {useHoverVisibleConnection} from '@app/editor/visible-connection'
import {send} from '@app/ipc'
import {useBlockObserve, useMouse} from '@app/mouse-context'
import {mergeRefs} from '@app/utils/mege-refs'
import {
  isStaticParagraph,
  StaticParagraph as StaticParagraphType,
} from '@mintter/shared'
import {SizableText, SizeTokens} from '@mintter/ui'
import {MouseEvent, useMemo, useRef} from 'react'
import {Path} from 'slate'
import {
  RenderElementProps,
  useSlate,
  useSlateSelector,
  useSlateStatic,
} from 'slate-react'
import type {EditorPlugin} from '../types'

export const ELEMENT_STATIC_PARAGRAPH = 'staticParagraph'

export const createStaticParagraphPlugin = (): EditorPlugin => ({
  name: ELEMENT_STATIC_PARAGRAPH,
})

export function StaticParagraphElement({
  children,
  element,
  attributes,
}: RenderElementProps) {
  let editor = useSlateStatic()
  let {elementProps, parentPath, parentNode} = usePhrasingProps(
    editor,
    element as StaticParagraphType,
  )
  let hoverProps = useHoverVisibleConnection(parentNode?.id)

  let paddingLeft = useMemo(
    () => (elementProps['data-parent-group'] == 'group' ? '$2' : 0),
    [elementProps],
  )

  let pRef = useRef<HTMLElement | undefined>()
  let otherProps = {
    ref: mergeRefs([attributes.ref, pRef]),
    ...hoverProps,
  }
  useBlockObserve(editor.mode, pRef)

  let elementTags = useMemo(() => {
    let defaultValue = {tag: 'p', size: 16, height: 24}
    if (parentPath) {
      return headingMap[parentPath.length] || defaultValue
    }

    return defaultValue
  }, [parentPath])

  return (
    <SizableText
      tag={elementTags.tag}
      size={elementTags.size}
      fontWeight="800"
      // paddingLeft={paddingLeft}
      alignItems="center"
      // size="$5"
      {...attributes}
      {...elementProps}
      {...otherProps}
    >
      {children}
    </SizableText>
  )
}
