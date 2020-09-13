import {SlatePlugin, setDefaults} from '@udecode/slate-plugins'
import {renderElementImage} from './renderElementImage'
import {DEFAULTS_IMAGE} from './defaults'

export function ImagePlugin(options?: any): SlatePlugin {
  const {img} = setDefaults(options, DEFAULTS_IMAGE)

  return {
    renderElement: renderElementImage(options),
    voidTypes: [img.type],
  }
}
