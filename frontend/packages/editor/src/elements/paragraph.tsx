import React from 'react'
import {Node} from 'slate'

import {
  ParagraphKeyOption,
  ParagraphPluginOptionsValues,
} from '@udecode/slate-plugins'
import {ReactEditor, useEditor} from 'slate-react'
import {ELEMENT_TRANSCLUSION} from '../TransclusionPlugin/defaults'
import {ELEMENT_PARAGRAPH} from './defaults'

export const paragraphOption = {}

export const PARAGRAPH_OPTIONS: Record<
  ParagraphKeyOption,
  Required<ParagraphPluginOptionsValues>
> = {
  p: {
    component: Paragraph,
    type: ELEMENT_PARAGRAPH,
    rootProps: {
      className: 'px-2 py-1 text-body text-xl leading-loose',
      as: 'p',
    },
  },
}

function Paragraph({
  as: Component = 'p',
  className,
  element,
  attributes,
  ...rest
}) {
  const editor = useEditor()
  const path = ReactEditor.findPath(editor, element)
  const [isInsideTransclusion, setValue] = React.useState(false)

  React.useEffect(() => {
    const parent = Node.parent(editor, path)
    setValue(parent.type === ELEMENT_TRANSCLUSION)
  }, [element, editor, path])

  return element.type === ELEMENT_PARAGRAPH ? (
    <Component
      {...attributes}
      contentEditable={!isInsideTransclusion}
      className={`${className} ${
        isInsideTransclusion ? 'border-2 bg-background-muted rounded' : ''
      }`}
      {...rest}
    />
  ) : null
}
