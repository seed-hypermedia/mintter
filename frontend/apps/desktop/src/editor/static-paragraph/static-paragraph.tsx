import {usePhrasingProps} from '@app/editor/editor-node-props'
import {headingMap} from '@app/editor/utils'
import {useHoverVisibleConnection} from '@app/editor/visible-connection'
import {mergeRefs} from '@app/utils/mege-refs'
import {StaticParagraph as StaticParagraphType} from '@mintter/shared'
import {SizableText} from '@mintter/ui'
import {useMemo, useRef} from 'react'
import {RenderElementProps, useSlateStatic} from 'slate-react'
import type {EditorPlugin} from '../types'

export const ELEMENT_STATIC_PARAGRAPH = 'staticParagraph'

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
      // size={elementTags.size}
      fontWeight="800"
      lineHeight={elementTags.size + 8}
      // paddingLeft={paddingLeft}
      alignItems="center"
      fontSize={elementTags.size}
      {...attributes}
      {...elementProps}
      {...otherProps}
    >
      {children}
    </SizableText>
  )
}
