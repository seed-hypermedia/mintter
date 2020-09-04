import {SlatePlugin} from '@udecode/slate-plugins'
import {renderElementTransclusion} from './renderElementTransclusion'

export function TransclusionPlugin(options?: any): SlatePlugin {
  const {transclusion} = options

  return {
    renderElement: renderElementTransclusion(options),
    voidTypes: [transclusion.type],
  }
}
