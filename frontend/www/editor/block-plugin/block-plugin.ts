import {SlatePlugin} from '@udecode/slate-plugins'
import {renderElementBlock} from './render-element-block'

export function BlockPlugin(options?: any): SlatePlugin {
  return {
    renderElement: renderElementBlock(options),
  }
}
