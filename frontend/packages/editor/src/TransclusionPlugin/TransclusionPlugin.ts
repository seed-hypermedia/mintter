import {SlatePlugin} from '@udecode/slate-plugins'
import {renderElementTransclusion} from './renderElementTransclusion'
import {onKeyDownTransclusion} from './onKeyDownTransclusion'

export function TransclusionPlugin(options?: any): SlatePlugin {
  return {
    renderElement: renderElementTransclusion(options),
    onKeyDown: onKeyDownTransclusion(options),
    // voidTypes: [transclusion.type],
  }
}
