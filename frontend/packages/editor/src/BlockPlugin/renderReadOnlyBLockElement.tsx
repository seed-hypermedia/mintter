import React from 'react'
import {getRenderElement, setDefaults} from '@udecode/slate-plugins'
import {ReadOnlyBlock} from './components/readOnlyBlock'
import {DEFAULTS_BLOCK} from './defaults'

export function renderReadOnlyBlockElement(options?: any, transformers?: any) {
  const {block} = setDefaults(options, DEFAULTS_BLOCK)
  return getRenderElement({
    ...block,
    component: props => (
      <ReadOnlyBlock
        {...props}
        createTransclusion={transformers.createTransclusion}
      />
    ),
  })
}
