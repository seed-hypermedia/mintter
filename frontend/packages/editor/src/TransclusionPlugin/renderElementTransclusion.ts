import {getRenderElement, setDefaults} from '@udecode/slate-plugins'
import {DEFAULTS_TRANSCLUSION} from './defaults'
import {TransclusionElement} from './components'
export const renderElementTransclusion = (options?: any) => {
  const {transclusion} = setDefaults(options, DEFAULTS_TRANSCLUSION)

  return getRenderElement({
    ...transclusion,
    component: TransclusionElement,
  })
}
