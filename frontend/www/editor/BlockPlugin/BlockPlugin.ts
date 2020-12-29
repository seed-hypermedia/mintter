import {SlatePlugin} from '@udecode/slate-plugins'
import {renderElementBlock} from './renderElementBlock'

export function BlockPlugin(options?: any): SlatePlugin {
  return {
    renderElement: renderElementBlock(options),
  }
}
