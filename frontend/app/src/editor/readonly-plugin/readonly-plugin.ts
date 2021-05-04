import type { SlatePlugin } from '@udecode/slate-plugins';
import { ELEMENT_READ_ONLY } from './defaults';
import { renderElementReadOnly } from './render-element-readonly';

// TODO: fix types
export function ReadOnlyPlugin(options?: any): SlatePlugin {
  return {
    renderElement: renderElementReadOnly(options),
    voidTypes: [ELEMENT_READ_ONLY],
  };
}
