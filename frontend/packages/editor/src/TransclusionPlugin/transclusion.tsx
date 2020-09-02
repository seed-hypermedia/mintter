import * as React from 'react'
import {getRenderElement} from '@udecode/slate-plugins'
import {useSelected} from 'slate-react'

export const ELEMENT_TRANSCLUSION = 'transclusion'

export const TransclusionElement = ({
  attributes,
  children,
  element,
  className,
}) => {
  const {id} = element
  const selected = useSelected()
  return (
    <div
      {...attributes}
      className={`p-4 border-2 ${
        selected ? 'border-info' : 'border-transparent'
      }${className ? className : ''}`}
    >
      <div contentEditable={false}>Transclusions: {id}</div>
      {children}
    </div>
  )
}

export const TRANSCLUSION_OPTIONS = {
  transclusion: {
    component: TransclusionElement,
    type: ELEMENT_TRANSCLUSION,
    rootProps: {},
  },
}

export const renderElementTransclusion = (options?: any) => {
  const {transclusion} = options

  return getRenderElement(transclusion)
}
