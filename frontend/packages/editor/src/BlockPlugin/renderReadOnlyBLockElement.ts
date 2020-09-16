import {getRenderElement, setDefaults} from '@udecode/slate-plugins'
import {ReadOnlyBlock} from './components/readOnlyBlock'
import {DEFAULTS_BLOCK} from './defaults'

export function renderReadOnlyBlockElement(options?: any) {
  const {block} = setDefaults(options, DEFAULTS_BLOCK)
  return getRenderElement({
    ...block,
    component: ReadOnlyBlock,
  })
}
