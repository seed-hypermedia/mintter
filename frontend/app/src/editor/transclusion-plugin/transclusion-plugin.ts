import type { SlatePlugin } from '@udecode/slate-plugins';
import { renderElementTransclusion } from './render-element-transclusion';
import { onKeyDownTransclusion } from './on-keydown-transclusion';

export function TransclusionPlugin(options?: any): SlatePlugin {
  return {
    renderElement: renderElementTransclusion(options),
    onKeyDown: onKeyDownTransclusion(options),
    // voidTypes: [options.transclusion.type],
  };
}
