import {
  getRenderLeafDefault,
  getLeafDeserializer,
  SlatePlugin,
} from '@udecode/slate-plugins'
import {UNDERLINE_OPTIONS, MARK_UNDERLINE} from '../marks/underline'

export function LinkPlugin(): SlatePlugin {
  return {
    renderLeaf: getRenderLeafDefault({
      key: MARK_UNDERLINE,
      defaultOptions: UNDERLINE_OPTIONS,
    }),
    deserialize: {
      leaf: getLeafDeserializer({
        type: MARK_UNDERLINE,
        rules: [{nodeNames: 'A'}],
      }),
    },
  }
}
