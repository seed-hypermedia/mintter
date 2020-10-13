import {SlatePlugin} from '@udecode/slate-plugins'
import {ELEMENT_READ_ONLY} from './defaults'
import {renderElementReadOnly} from './renderElementReadOnly'

export function ReadOnlyPlugin(options?: any): SlatePlugin {
  return {
    renderElement: renderElementReadOnly(options),
    voidTypes: [ELEMENT_READ_ONLY],
  }
}
