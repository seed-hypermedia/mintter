import {SlatePlugin, setDefaults} from '@udecode/slate-plugins'
import {renderElementTransclusion} from './renderElementTransclusion'
import {DEFAULTS_TRANSCLUSION} from './defaults'

export function TransclusionPlugin(options?: any): SlatePlugin {
  const {transclusion} = setDefaults(options, DEFAULTS_TRANSCLUSION)

  return {
    renderElement: renderElementTransclusion(options),
    voidTypes: [transclusion.type],
  }
}
