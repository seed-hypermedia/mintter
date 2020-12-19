import React from 'react'
import {getRenderElement, setDefaults} from '@udecode/slate-plugins'
import {DEFAULTS_TRANSCLUSION} from './defaults'
import {Transclusion} from './components/transclusion'

export const renderElementTransclusion = (options?: any) => {
  const {transclusion} = setDefaults(options, DEFAULTS_TRANSCLUSION)
  const {customProps = {}} = transclusion
  return getRenderElement({
    ...transclusion,
    component: props => <Transclusion {...props} {...customProps} />,
  })
}
