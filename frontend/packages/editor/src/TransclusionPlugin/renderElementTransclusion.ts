import {getRenderElement} from '@udecode/slate-plugins'

export const renderElementTransclusion = (options?: any) => {
  const {transclusion} = options

  return getRenderElement(transclusion)
}
