import {SlatePlugin} from '@udecode/slate-plugins'
import {renderElementImage} from './image'

export function ImagePlugin(options?: any): SlatePlugin {
  const {img} = options

  return {
    renderElement: renderElementImage(options),
    voidTypes: [img.type],
  }
}
