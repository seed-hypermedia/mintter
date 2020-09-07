import {getRenderElement, setDefaults} from '@udecode/slate-plugins'
import {DEFAULTS_IMAGE} from './defaults'

export function renderElementImage(options?: any) {
  const {img} = setDefaults(options, DEFAULTS_IMAGE)

  return getRenderElement(img)
}
